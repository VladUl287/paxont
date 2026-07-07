(module
  (memory (export "u8") 1 128)

  (global $valid_utf8 (mut i32) (i32.const 1))
  (global $ascii_symbols_count (mut i32) (i32.const 0))
  (global $ascii_prefix_index (mut i32) (i32.const 0))

  (func (export "utf8_to_utf16") (param $utf8_ptr i32) (param $utf8_len i32) (param $utf16_ptr i32) (result i32)
    (local $i i32)
    (local $vec v128)
    (local $ascii v128)
    (local $zero v128)
    (local $double_quote v128)
    (local $mask i32)
    (local $temp1 i32)
    (local $temp2 i32)

    i32.const 34  ;; ASCII code for '"'
    i8x16.splat
    local.set $double_quote

    local.get $utf8_ptr
    local.set $i

    i32.const 128
    i8x16.splat
    local.set $ascii

    i32.const 0
    i8x16.splat
    local.set $zero

    (block $done
      (loop $main
        local.get $i
        i32.const 16
        i32.add
        local.get $utf8_len
        i32.le_u
        i32.eqz
        br_if $done

        local.get $i
        v128.load
        local.set $vec

        local.get $vec
        local.get $ascii
        v128.and
        local.get $zero
        i8x16.eq
        v128.not
        v128.any_true 

        if
          local.get $i
          i32.const 16
          i32.sub
          global.set $ascii_prefix_index
          br $done
        end

        local.get $vec
        local.get $double_quote
        i8x16.eq

        i8x16.bitmask
        local.tee $mask

        if
          local.get $mask
          i32.ctz
          local.tee $mask

          local.get $i 
          i32.const 0
          i32.gt_u

          if
            local.get $i
            local.get $mask
            i32.add
            i32.const 1
            i32.sub
            i32.load8_u
            i32.const 92   ;; ASCII code for '\'
            i32.eq
            if
              local.get $i
              local.get $mask
              i32.add
              i32.const 1
              i32.add
              local.set $i
              br $main
            end
          end

          local.get $i
          local.get $mask
          i32.add
          global.set $ascii_prefix_index

          local.get $i
          local.get $mask
          i32.add
          return
        end

        local.get $i
        i32.const 16
        i32.add
        local.set $i
        br $main
      )
    )

    local.get $i
    i32.const 16
    i32.add
    local.get $utf8_len
    i32.ge_u

    if
      (loop $tail
        local.get $i
        local.get $utf8_len
        i32.ge_u
        if
          local.get $utf8_len
          return
        end

        local.get $i
        i32.load8_u
        i32.const 34
        i32.eq
        if
          local.get $i 
          i32.const 0
          i32.gt_u

          if
            local.get $i
            i32.const 1
            i32.sub
            i32.load8_u
            i32.const 92   ;; ASCII code for '\'
            i32.eq
            if
              local.get $i
              i32.const 1
              i32.add
              local.set $i
              br $tail
            end
          end

          local.get $i
          return
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $tail
      )
    end

    (block $done
      (loop $tail
        local.get $i
        local.get $utf8_len
        i32.ge_u
        if br $done end

        (i32.load offset=0 align=1 (local.get $i))
        local.tee $mask

        ;; all ascii
        local.get $mask
        i32.const 0x80808080
        i32.and
        i32.const 0
        i32.eq
        if
          (call $find_unescaped_quote (local.get $mask))
          (local.tee $temp1)
          i32.const -1
          i32.gt_u
          if
            (i32.ctz (local.get $mask))
            i32.const 8
            i32.div_u
            return
          end

          ;; increment ascii_symbols_count
          (i32.store (local.get $utf16_ptr) (local.get $mask))
          local.get $i
          i32.const 4
          i32.add
          br $tail
        end
        ;; else check if first, second and third bytes are ascii 

        ;; two byte value
        local.get $mask
        i32.const 32960
        i32.sub
        i32.const 49376
        i32.and
        i32.const 0
        i32.eq

        if 
          (call $inRangeInclusive
            (i32.and (local.get $mask) (i32.const 0xC0FF0000))
            (i32.const 2160197632)
            (i32.const 2162098176)
          )
          i32.const 1
          i32.eq
          if
            local.get $utf16_ptr
            (call $extractTwoCharsFromTwoByteSeq (local.get $mask))
            i32.store
            local.get $i
            i32.const 4
            i32.add
            local.set $i
            br $tail
          end

          local.get $utf16_ptr
          (call $extractOneCharFromTwoByteSeq (local.get $mask))
          i32.store
          local.get $i
          i32.const 2
          i32.add
          local.set $i
          br $tail
          ;; check 2 end bytes manually
        end

        ;; three byte value
        local.get $mask
        i32.const 8421600
        i32.sub
        i32.const 12632304
        i32.and
        i32.const 0
        i32.eq

        if 
          ;; if ((num2 & 0x200F) == 0 || ((num2 - 8205) & 0x200F) == 0)
          ;; {
          ;; 				break;
          ;; }

          local.get $utf16_ptr
          (call $extractCharFromThreeByteSeq (local.get $mask))
          i32.store
          local.get $i
          i32.const 3
          i32.add
          local.set $i
          br $tail
        end

        ;; four byte value
        local.get $mask
        i32.const 2155905264
        i32.sub
        i32.const 3233857784
        i32.and
        i32.const 0
        i32.eq

        if
          (call $inRangeInclusive
            (call $rotateRight 
              (i32.and (local.get $mask) (i32.const 0xFFFF))
              (i32.const 8)
            )
            (i32.const 4026531984)
            (i32.const 4093640847)
          )
          if
            local.get $utf16_ptr
            (call $extractCharsFromFourByteSeq (local.get $mask))
            i32.store
            local.get $i
            i32.const 4
            i32.add
            local.set $i
            br $tail
          end
          ;; if not in range then not valid utf8 do return and mark as not valid
        end

        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $tail
      )
    )
    
    local.get $i
  )

  (func $parse_ascii_prefix (param $i i32) (param $len i32) (result i32)
    (local $data_vec v128)
    (local $zero_vec v128)
    (local $ascii_vec v128)
    (local $quote_vec v128)
    (local $bitmask i32)
    (local $j i32)
    (local $is_escaped i32)
    
    (local.set $zero_vec (i8x16.splat (i32.const 0)))
    (local.set $quote_vec (i8x16.splat (i32.const 34)))
    (local.set $ascii_vec (i8x16.splat (i32.const 128)))

    (block $done
      (loop $loop
        ;; i <= length - 16
        (br_if $done 
          (i32.eqz (i32.le_u 
            (i32.add (local.get $i) (i32.const 16)) 
            (local.get $len)
          ))
        )

        ;; any non ascii byte
        (v128.any_true (
          v128.not (
            i8x16.eq 
              (v128.and 
                (local.tee $data_vec (v128.load (local.get $i))) 
                (local.get $ascii_vec))
              (local.get $zero_vec)
          )
        ))
        if (return (local.get $i)) end

        ;; contains double quote
        (local.tee $bitmask (
          i8x16.bitmask (
            i8x16.eq 
              (local.get $data_vec) 
              (local.get $quote_vec)
          )
        ))
        
        if
          (block $quote_block
            (loop $quote_loop        
              ;; i >= length
              (br_if $quote_block
                (i32.ge_u (local.get $i) (local.get $len))
              )
  
              ;; current char is double quote (34)
              (if (i32.eq (i32.load8_u (local.get $i)) (i32.const 34))
                (then
                  (local.set $j (local.get $i))
                  (local.set $is_escaped (i32.const 0))

                  (block $backslash_block
                    (loop $backslash_loop
                      ;; --j
                      (local.set $j (i32.sub (local.get $j) (i32.const 1)))

                      ;; j > 0
                      (br_if $backslash_block (
                        i32.eqz (i32.gt_u (local.get $j) (i32.const -1)))
                      )
                      
                      ;; check for backslash (92)
                      (if (i32.eq (i32.load8_u (local.get $j)) (i32.const 92))
                        (then
                          ;; is_escaped = !is_escaped
                          (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                        )
                        (else
                          ;; Not a backslash, stop counting
                          (br $backslash_block)
                        )
                      )
                    )
                  )
  
                  ;; if not escaped, return position
                  (br_if $done
                    (i32.eqz (local.get $is_escaped))
                    (return (local.get $i))
                  )
                )
              )
            )
          )
        end

        ;; i += 16
        (local.set $i (
          i32.add (local.get $i) (i32.const 16)
        ))
        br $loop
      )
    )
    
    i32.const 1
  )

  (func $find_unescaped_quote (param $value i32) (result i32)
    (local $q i32)
    (local $is_quote i32)
    (local $b i32)
    (local $is_backslash i32)
    (local $escaped_backslash i32)
    (local $truly_escaped_quotes i32)
    (local $unescaped_quotes i32)
    
    ;; Detect bytes equal to 0x22 (quote)
    ;; uint32_t q = value ^ 0x22222222;
    (local.set $q (i32.xor (local.get $value) (i32.const 0x22222222)))
    
    ;; uint32_t is_quote = ((q - 0x01010101) & ~q & 0x80808080);
    (local.tee $is_quote 
      (i32.and 
        (i32.and 
          (i32.sub (local.get $q) (i32.const 0x01010101))
          (i32.xor (local.get $q) (i32.const -1))  ;; ~q
        )
        (i32.const 0x80808080)
      )
    )
    ;; if (is_quote == 0) return -1;
    i32.eqz
    if (return (i32.const -1)) end
    
    ;; Detect bytes equal to 0x5C (backslash)
    ;; uint32_t b = value ^ 0x5C5C5C5C;
    (local.set $b (i32.xor (local.get $value) (i32.const 0x5C5C5C5C)))
    
    ;; uint32_t is_backslash = ((b - 0x01010101) & ~b & 0x80808080);
    (local.tee $is_backslash 
      (i32.and 
        (i32.and 
          (i32.sub (local.get $b) (i32.const 0x01010101))
          (i32.xor (local.get $b) (i32.const -1))  ;; ~b
        )
        (i32.const 0x80808080)
      )
    )
    
    ;; if (is_backslash == 0) {
    ;;     int bit_index = __builtin_ctz(is_quote);
    ;;     return bit_index / 8;
    ;; }
    i32.eqz
    if 
      (i32.ctz (local.get $is_quote))
      i32.const 8
      i32.div_s
      return
    end
    
    ;; Detect escaped backslashes (two backslashes in a row)
    ;; uint32_t escaped_backslash = is_backslash & (is_backslash >> 8);
    (local.set $escaped_backslash 
      (i32.and 
        (local.get $is_backslash)
        (i32.shr_u (local.get $is_backslash) (i32.const 8))
      )
    )
    
    ;; A quote is escaped if:
    ;; 1. There's a backslash before it (is_backslash >> 8)
    ;; 2. That backslash is NOT escaped
    ;; uint32_t truly_escaped_quotes = (is_backslash >> 8) & is_quote & ~escaped_backslash;
    (local.set $truly_escaped_quotes
      (i32.and
        (i32.and
          (i32.shr_u (local.get $is_backslash) (i32.const 8))
          (local.get $is_quote)
        )
        (i32.xor (local.get $escaped_backslash) (i32.const -1))  ;; ~escaped_backslash
      )
    )
    
    ;; Quote at position 0 can't be escaped
    ;; truly_escaped_quotes &= ~0x80;
    (local.set $truly_escaped_quotes
      (i32.and 
        (local.get $truly_escaped_quotes)
        (i32.xor (i32.const 0x80) (i32.const -1))  ;; ~0x80
      )
    )
    
    ;; Get all unescaped quotes
    ;; uint32_t unescaped_quotes = is_quote & ~truly_escaped_quotes;
    (local.tee $unescaped_quotes
      (i32.and
        (local.get $is_quote)
        (i32.xor (local.get $truly_escaped_quotes) (i32.const -1))  ;; ~truly_escaped_quotes
      )
    )
    
    ;; If no unescaped quotes, return -1
    ;; if (unescaped_quotes == 0) return -1;
    i32.eqz
    if (return (i32.const -1)) end

    ;; return __builtin_ctz(unescaped_quotes) / 8;
    (i32.ctz (local.get $unescaped_quotes))
    i32.const 8
    i32.div_s 
    return
  )
 
  (func $rotateRight (param $value i32) (param $offset i32) (result i32)
    (i32.or
      (i32.shr_u (local.get $value) (local.get $offset))
      (i32.shl (local.get $value) (i32.sub (i32.const 32) (local.get $value)))
    )
  )

  (func $extractOneCharFromTwoByteSeq (param $value i32) (result i32)
    (i32.sub
      (i32.sub
        (i32.add
          (i32.and (i32.shr_u (local.get $value) (i32.const 8)) (i32.const 0xFF))
          (i32.and (i32.shl (local.get $value) (i32.const 6)) (i32.const 0xFF))
        )
        (i32.const 12288)
      )
      (i32.const 128)
    )
  )

  (func $extractTwoCharsFromTwoByteSeq (param $value i32) (result i32)
    (i32.or
      (i32.shr_u
        (i32.and (local.get $value) (i32.const 0x3F003F00))
        (i32.const 8)
      )
      (i32.shl
        (i32.and (local.get $value) (i32.const 0x001F001F))
        (i32.const 6)
      )
    )
  )

  (func $extractCharFromThreeByteSeq (param $value i32) (result i32)
    (i32.or
      (i32.or
        (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F0000)) (i32.const 16))
        (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F00)) (i32.const 2))
      )
      (i32.shl (i32.and (local.get $value) (i32.const 0xF)) (i32.const 12))
    )
  )

  (func $extractCharsFromFourByteSeq (param $value i32) (result i32)
    (local $result i32)
    (local $byteValue i32)
    (local $temp i32)
    
    ;; Extract byte from value (cast to byte)
    (local.set $byteValue (i32.and (local.get $value) (i32.const 0xFF)))
    
    ;; (value << 8)
    (local.set $temp (i32.shl (local.get $byteValue) (i32.const 8)))
    (local.set $result (local.get $temp))
    
    ;; | ((value & 0x3F00) >> 6)
    (local.set $temp (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F00)) (i32.const 6)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; | ((value & 0x300000) >> 20)
    (local.set $temp (i32.shr_u (i32.and (local.get $value) (i32.const 0x300000)) (i32.const 20)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; | ((value & 0x3F000000) >> 8)
    (local.set $temp (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F000000)) (i32.const 8)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; | ((value & 0xF0000) << 6)
    (local.set $temp (i32.shl (i32.and (local.get $value) (i32.const 0xF0000)) (i32.const 6)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; - 64 - 8192 + 2048 + 3690987520u
    (local.set $result (i32.sub (local.get $result) (i32.const 64)))
    (local.set $result (i32.sub (local.get $result) (i32.const 8192)))
    (local.set $result (i32.add (local.get $result) (i32.const 2048)))
    (local.set $result (i32.add (local.get $result) (i32.const 3690987520)))
    
    (return (local.get $result))
  )

  (func $inRangeInclusive (param $value i32) (param $lowerBound i32) (param $upperBound i32) (result i32)
    (i32.le_s
      (i32.sub (local.get $value) (local.get $lowerBound))
      (i32.sub (local.get $upperBound) (local.get $lowerBound))
    )
  )
  (export "inRangeInclusive" (func $inRangeInclusive))
)