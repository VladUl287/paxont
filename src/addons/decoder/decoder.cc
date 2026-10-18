#include <napi.h>
#include <cstdint>
#include <cstring>

#if defined(__SSE2__) || defined(_M_X64) || \
    (defined(_M_IX86_FP) && _M_IX86_FP >= 2)
#include <emmintrin.h>
#define HAVE_SSE2 1
#else
#define HAVE_SSE2 0
#endif

using u8 = uint8_t;
using u16 = uint16_t;
using u32 = uint32_t;
using i32 = int32_t;

static i32 g_dq_index = -1;

namespace
{
  inline i32 hex_to_value_impl(u8 c)
  {
    if (c >= '0' && c <= '9')
      return c - '0';
    if (c >= 'A' && c <= 'F')
      return c - 'A' + 10;
    if (c >= 'a' && c <= 'f')
      return c - 'a' + 10;
    return -1;
  }

  inline bool in_range_inclusive(u32 v, u32 lo, u32 hi)
  {
    return (u32)(v - lo) <= (u32)(hi - lo);
  }

  inline u32 rotate_r(u32 v, int n)
  {
    return (v >> n) | (v << (32 - n));
  }

  i32 find_quote_impl(const u8 *mem, i32 i, i32 start, i32 end)
  {
    while ((u32)i <= (u32)end)
    {
      if (mem[i] == 34)
      {
        i32 j = i;
        bool escaped = false;
        while (true)
        {
          j--;
          if (j < start)
            break;
          if (mem[j] != 92)
            break;
          escaped = !escaped;
        }
        if (!escaped)
          return i;
      }
      i++;
    }
    return -1;
  }

  struct ParseUResult
  {
    i32 pos;
    i32 value;
  };

  ParseUResult parse_unicode_escape_impl(const u8 *mem, i32 pos, i32 len)
  {
    i32 i = pos;
    u32 v = 0;
    if ((u32)(i + 4) >= (u32)len)
      return {i, -1};
    for (int k = 0; k < 4; ++k)
    {
      i32 h = hex_to_value_impl(mem[i]);
      if (h == -1)
        return {i, -1};
      v = (v << 4) | (u32)h;
      ++i;
    }
    return {i, (i32)v};
  }

  inline uint8_t *store_32(uint8_t *target, uint32_t value)
  {
    std::memcpy(target, &value, 4);
    return target + 4;
  }

  inline i32 store_code_point(u8 *mem, i32 target, u32 cp)
  {
    if (cp < 0x10000)
    {
      u16 v = (u16)cp;
      std::memcpy(mem + target, &v, 2);
      return target + 2;
    }
    cp -= 0x10000;
    u16 hi = (u16)(0xD800 + (cp >> 10));
    u16 lo = (u16)(0xDC00 + (cp & 0x3FF));
    std::memcpy(mem + target, &hi, 2);
    std::memcpy(mem + target + 2, &lo, 2);
    return target + 4;
  }

#if HAVE_SSE2
  inline i32 store_128_unsafe(u8 *mem, __m128i data, i32 byte_count, i32 target)
  {
    u8 tmp[16];
    _mm_storeu_si128(reinterpret_cast<__m128i *>(tmp), data);
    for (i32 k = 0; k < byte_count; ++k)
    {
      u16 v = (u16)tmp[k];
      std::memcpy(mem + target + k * 2, &v, 2);
    }
    return target + byte_count * 2;
  }
#endif

  struct StoreSeqResult
  {
    i32 i;
    i32 target;
  };

  StoreSeqResult store_sequentially_impl(uint8_t *mem, i32 start, i32 end, i32 len, i32 target)
  {
    i32 i = start, j = target;

    while ((u32)i < (u32)end)
    {
      u8 byte = mem[i];

      if (byte == 0x5C)
      { // '\'
        if ((u32)(i + 1) >= (u32)len)
          break;
        ++i;
        byte = mem[i];

        switch (byte)
        {
        case 'n':
          j = store_32(mem, 0x0A, j);
          ++i;
          continue;
        case 't':
          j = store_32(mem, 0x09, j);
          ++i;
          continue;
        case 'r':
          j = store_32(mem, 0x0D, j);
          ++i;
          continue;
        case 'b':
          j = store_32(mem, 0x08, j);
          ++i;
          continue;
        case 'f':
          j = store_32(mem, 0x0C, j);
          ++i;
          continue;
        case '\\':
          j = store_32(mem, 0x5C, j);
          ++i;
          continue;
        case '"':
          j = store_32(mem, 0x22, j);
          ++i;
          continue;
        case '\'':
          j = store_32(mem, 0x27, j);
          ++i;
          continue;
        case 'u':
        {
          ++i;
          auto r1 = parse_unicode_escape_impl(mem, i, len);
          i = r1.pos;
          if (r1.value == -1)
            return {i - 2, j};
          u32 hi = (u32)r1.value;

          if (hi >= 0xD800 && hi <= 0xDBFF)
          {
            if (i + 1 < len && mem[i] == 0x5C && mem[i + 1] == 0x75)
            {
              i += 2;
              auto r2 = parse_unicode_escape_impl(mem, i, len);
              i = r2.pos;
              if (r2.value == -1)
                return {i - 2, j};
              u32 lo = (u32)r2.value;
              if (lo >= 0xDC00 && lo <= 0xDFFF)
              {
                u32 cp = ((hi - 0xD800) << 10) + (lo - 0xDC00) + 0x10000;
                j = store_code_point(mem, j, cp);
                continue;
              }
              j = store_32(mem, hi, j);
              i -= 6;
              continue;
            }
            j = store_32(mem, hi, j);
            continue;
          }
          j = store_code_point(mem, j, hi);
          continue;
        }
        default:
          continue;
        }
      }

      if (byte < 0x80)
      {
        j = store_32(mem, byte, j);
        ++i;
      }
      else if ((byte & 0xE0) == 0xC0)
      {
        u32 cp = ((byte & 0x1F) << 6) | (mem[i + 1] & 0x3F);
        j = store_code_point(mem, j, cp);
        i += 2;
      }
      else if ((byte & 0xF0) == 0xE0)
      {
        u32 cp = ((byte & 0x0F) << 12) | ((mem[i + 1] & 0x3F) << 6) | (mem[i + 2] & 0x3F);
        j = store_code_point(mem, j, cp);
        i += 3;
      }
      else if ((byte & 0xF8) == 0xF0)
      {
        u32 cp = ((byte & 0x07) << 18) | ((mem[i + 1] & 0x3F) << 12) | ((mem[i + 2] & 0x3F) << 6) | (mem[i + 3] & 0x3F);
        j = store_code_point(mem, j, cp);
        i += 4;
      }
      else
      {
        return {-1, -1};
      }
    }
    return {i, j};
  }

  struct ParseAsciiResult
  {
    i32 i;
    uint8_t *target;
  };

  ParseAsciiResult parse_ascii_impl(uint8_t *src, uint8_t *target, i32 start, i32 end)
  {
    i32 i = start;

#if HAVE_SSE2
    while ((u32)(i + 16) < (u32)end)
    {
      __m128i data = _mm_loadu_si128(reinterpret_cast<const __m128i *>(mem + i));

      /* count leading ASCII bytes */
      u32 non_ascii_mask = (u32)_mm_movemask_epi8(data);
      i32 byte_count = (non_ascii_mask == 0) ? 16 : __builtin_ctz(non_ascii_mask);

      /* backslash anywhere in chunk? */
      u32 bs_mask = (u32)_mm_movemask_epi8(_mm_cmpeq_epi8(data, _mm_set1_epi8(92)));
      if (bs_mask)
      {
        goto scalar_loop;
      }

      /* quote anywhere in chunk? */
      u32 q_mask = (u32)_mm_movemask_epi8(_mm_cmpeq_epi8(data, _mm_set1_epi8(34)));
      if (q_mask)
      {
        i32 qpos = __builtin_ctz(q_mask);
        if ((u32)qpos <= (u32)byte_count)
          byte_count = qpos;
        target = store_128_unsafe(mem, data, byte_count, target);
        return {i + byte_count, target};
      }

      target = store_128_unsafe(mem, data, byte_count, target);
      i += byte_count;
      if (byte_count == 16)
        continue;
      return {i, target};
    }

  scalar_loop:
#endif
    while ((u32)i < (u32)end)
    {
      uint8_t byte = src[i];
      if (byte >= 0x80)
        return {i, target};
      if (byte == 34)
        return {i, target};

      // if (byte == 0x5C)
      // {
      //   auto r = store_sequentially_impl(src, i, i + 1, end);
      //   i = r.i;
      //   target = r.target;
      //   if (i == -1)
      //     return {-1, -1};
      //   continue;
      // }

      target = store_32(target, byte);
      ++i;
    }
    return {i, target};
  }

  ParseAsciiResult utf8_to_utf16_impl(uint8_t *src, uint8_t *target, uint32_t start, uint32_t end)
  {
    uint32_t i = start;
    g_dq_index = -1;

    while (i < end)
    {
      /* ASCII fast path */
      if (src[i] < 0x80)
      {
        auto r = parse_ascii_impl(src, target, i, end);
        i = r.i;
        target = r.target;
        if (i == -1)
          return {-1, -1};
        if (i == end)
          return {i, target};
        if (src[i] == 34)
        {
          uint32_t q = find_quote_impl(src, i, start, i);
          if (q >= 0)
          {
            g_dq_index = q;
            return {q, target};
          }
        }
        continue;
      }

      /* -------- 2-byte sequences -------- */
      if (src[i] < 0xE0)
      {
        bool first = true;

#if HAVE_SSE2
        while ((u32)(i + 16) < (u32)end)
        {
          __m128i data = _mm_loadu_si128(
              reinterpret_cast<const __m128i *>(src + i));

          __m128i masked = _mm_and_si128(
              data, _mm_set1_epi16((short)0xC0E0));
          __m128i expected = _mm_set1_epi16((short)0x80C0);
          u32 byte_mask = (u32)_mm_movemask_epi8(
              _mm_cmpeq_epi16(masked, expected));

          __m128i decoded = _mm_or_si128(
              _mm_slli_epi16(
                  _mm_and_si128(data, _mm_set1_epi16(0x001F)), 6),
              _mm_and_si128(
                  _mm_srli_epi16(data, 8), _mm_set1_epi16(0x003F)));

          if (byte_mask == 0xFFFF)
          {
            _mm_storeu_si128(reinterpret_cast<__m128i *>(src + target),
                             decoded);
            i += 16;
            target += 16;
            first = false;
            continue;
          }

          _mm_storeu_si128(reinterpret_cast<__m128i *>(src + target), decoded);
          u32 trailing = (u32)__builtin_ctz(byte_mask ^ 0xFFFF);
          i += trailing;
          target += trailing;
          goto next_iter;
        }
#endif
        /* scalar fallback for the remaining 2-byte pairs */
        if ((i + 4) > end)
          break;

        uint32_t mask;
        std::memcpy(&mask, src + i, 4);

        if (((mask - 0x80C0) & 0xC0E0) != 0)
        {
          /* not two back-to-back 2-byte sequences -> 3/4-byte handling */
          goto check_3_4;
        }

        if (in_range_inclusive(mask & 0xC0FF0000, 0x80C00000, 0x80E00000))
        {
          uint32_t out = ((mask & 0x3F003F00) >> 8) | ((mask & 0x001F001F) << 6);
          std::memcpy(src + target, &out, 4);
          i += 4;
          target += 4;
          continue;
        }

        {
          uint32_t v = ((mask >> 8) & 0xFF) + ((mask & 0xFF) << 6) - 12288 - 128;
          uint16_t v16 = (uint16_t)v;
          std::memcpy(src + target, &v16, 2);
          i += 2;
          target += 2;
          continue;
        }
      }

    check_3_4:
      /* -------- 3-byte sequences -------- */
      if ((i + 4) > end)
        break;
      {
        uint32_t mask;
        std::memcpy(&mask, src + i, 4);

        if (((mask - 0x8080E0) & 0xC0C0F0) == 0)
        {
          bool valid = ((mask & 0x200F) != 0) && (((mask - 8205) & 0x200F) != 0);
          if (valid)
          {
            uint32_t out = ((mask & 0x3F0000) >> 16) | ((mask & 0x3F00) >> 2) | ((mask & 0xF) << 12);
            uint16_t v16 = (uint16_t)out;
            std::memcpy(src + target, &v16, 2);
            target += 2;
            i += 3;
            continue;
          }
        }

        /* -------- 4-byte sequences -------- */
        if (((mask - 0x808080F0) & 0xC0C0C0F8) == 0)
        {
          if (in_range_inclusive(rotate_r(mask & 0xFFFF, 8), 0xF00000F0u, 0xF401F4CFu))
          {
            uint32_t out = ((mask & 0xFF) << 8) | ((mask & 0x3F00) >> 6) | ((mask & 0x300000) >> 20) | ((mask & 0x3F000000) >> 8) | ((mask & 0xF0000) << 6);
            out = out - 64 - 8192 + 2048 + 0xDC000000u;
            std::memcpy(src + target, &out, 4);
            target += 4;
            i += 4;
            continue;
          }
        }
      }

      return {-1, -1};

    next_iter:
      continue;
    }

    while ((i + 1) <= end)
    {
      uint8_t temp = src[i];
      if (temp < 0x80)
      {
        if (temp == 34)
        {
          uint32_t q = find_quote_impl(src, i, start, i);
          if (q >= 0)
          {
            g_dq_index = q;
            return {q, target};
          }
        }
        uint16_t v = temp;
        std::memcpy(target, &v, 2);
        target += 2;
        ++i;
        continue;
      }

      uint32_t start_byte = (uint32_t)temp - 194;

      if (start_byte < 30)
      { /* 2-byte tail */
        if ((i + 1) >= end)
          return {i, target};
        if ((u32)((u32)src[i + 1] - 128) >= 64)
          return {-1, -1};
        u16 v = (u16)(((temp & 0x1F) << 6) | (src[i + 1] & 0x3F));
        std::memcpy(src + target, &v, 2);
        target += 2;
        i += 2;
        continue;
      }

      if (start_byte < 46)
      { /* 3-byte tail */
        if ((u32)(i + 2) >= (u32)end)
          return {i, target};
        if ((u32)((u32)src[i + 1] - 128) >= 64 ||
            (u32)((u32)src[i + 2] - 128) >= 64)
          return {-1, -1};
        u32 partial = ((u32)start_byte << 12) | ((u32)src[i + 1] << 6);
        if (partial < 133120 ||
            (u32)(partial - 186368) < 2048)
          return {-1, -1};
        u16 v = (u16)(((temp & 0x0F) << 12) | ((src[i + 1] & 0x3F) << 6) | (src[i + 2] & 0x3F));
        std::memcpy(src + target, &v, 2);
        target += 2;
        i += 3;
        continue;
      }
      break;
    }

    if (i == end)
      return {i, target};
    return {-1, -1};
  }

  i32 utf8_seq_len(const u8 *mem, i32 ptr)
  {
    u8 b = mem[ptr];
    if ((b & 0x80) == 0)
      return 1;
    if ((b & 0xE0) == 0xC0)
      return 2;
    if ((b & 0xF0) == 0xE0)
      return 3;
    if ((b & 0xF8) == 0xF0)
      return 4;
    return 1;
  }

  i32 escape_seq_len(const u8 *mem, i32 start, i32 len)
  {
    if ((u32)(len - start) <= 2)
      return 0;
    i32 pos = start;
    if (mem[pos] != 92)
      return 0;
    ++pos;
    u8 b = mem[pos];
    switch (b)
    {
    case 0x22:
    case 0x5C:
    case 0x2F:
    case 0x62:
    case 0x66:
    case 0x6E:
    case 0x72:
    case 0x74:
      return 2;
    case 0x75:
    {
      if ((u32)(len - start) <= 6)
        return 0;
      auto r = parse_unicode_escape_impl(mem, pos, len);
      if (r.value == -1)
        return 0;
      if ((u32)r.value >= 0xD800 && (u32)r.value <= 0xDBFF)
        return 0;
      return 6;
    }
    default:
      return 0;
    }
  }

  i32 trim_to_last_char_impl(const u8 *mem, i32 start, i32 len)
  {
    i32 i = len - 1;
    while (true)
    {
      if (i < start)
        return -1;
      u8 b = mem[i];
      if (b == 92)
      {
        i32 esc = escape_seq_len(mem, i, len);
        i32 j = i;
        bool is_esc = false;
        while (true)
        {
          j--;
          if (j < start)
            break;
          if (mem[j] != 92)
            break;
          is_esc = !is_esc;
        }
        if (is_esc)
          return i + 1;
        if (esc > 0)
          return i + esc;
        --i;
        continue;
      }
      if ((b & 0xC0) == 0x80)
      {
        --i;
        continue;
      }

      i32 seq = utf8_seq_len(mem, i);
      if (seq == 1)
      {
        i32 j = i;
        i32 bound = i - 6;
        if (bound < start)
          bound = start;
        while (j >= bound)
        {
          if (mem[j] == 92)
          {
            bool is_esc = false;
            i32 t = j;
            while (true)
            {
              t--;
              if (t < start)
                break;
              if (mem[t] != 92)
                break;
              is_esc = !is_esc;
            }
            if (is_esc)
              return i + 1;
            i32 esc = escape_seq_len(mem, j, i);
            if (esc > 0)
              return j + esc;
            i = j - 1;
            goto next;
          }
          --j;
        }
        return i + seq;
      }
      if (i + seq < len)
        return i + seq;
      --i;
    next:
      continue;
    }
  }
}

static Napi::Value n_utf8_to_utf16(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  auto src = info[0].As<Napi::Uint8Array>();
  uint8_t *mem_source = src.Data();
  auto target = info[1].As<Napi::Uint8Array>();
  uint8_t *mem_target = src.Data();
  uint32_t start = info[2].As<Napi::Number>().Uint32Value();
  uint32_t end = info[3].As<Napi::Number>().Uint32Value();

  auto r = utf8_to_utf16_impl(mem_source, mem_target, start, end);
  Napi::Object o = Napi::Object::New(env);
  o.Set("start", Napi::Number::New(env, r.start));
  o.Set("end", Napi::Number::New(env, r.end));
  return o;
}

static Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("utf8_to_utf16", Napi::Function::New(env, n_utf8_to_utf16));
  return exports;
}

NODE_API_MODULE(wasm_addon, Init)