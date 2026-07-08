(module
  (memory (export "u8") 1 128)

  (global $valid_utf8 (mut i32) (i32.const 0))
  (global $ascii_symbols_count (mut i32) (i32.const 0))
  (global $ascii_prefix_len (mut i32) (i32.const 0))
  (global $string_len (mut i32) (i32.const 0))

  (func (export "utf8_to_utf16") (param $utf8_ptr i32) (param $utf8_len i32) (param $utf16_ptr i32) (result i32)
    (local $i i32)
    (local $prefix_length i32)
    (local $ascii v128)
    (local $zero v128)
    (local $double_quote v128)
    (local $mask i32)
    (local $temp1 i32)

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

    (local.tee $prefix_length 
      (call $parse_ascii_prefix (local.get $i) (local.get $utf8_len))
    )
    if
      (if (global.get $string_len) 
        (then 
          (global.set $valid_utf8 (i32.const 1))
          (global.set $ascii_symbols_count (local.get $prefix_length))
          (global.set $ascii_prefix_len (local.get $prefix_length))
        )
      )

      (i32.eq (global.get $string_len) (local.get $utf8_len))
      if (return (i32.const -1)) end
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
          (call $find_unescaped_quote (i32.const 1) (local.get $mask))
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
    (local $start i32)
    (local $data_vec v128)
    (local $ascii_vec v128)          
    (local $quote_vec v128)
    (local $non_ascii_mask i32)
    (local $byte i32)
    (local $j i32)
    (local $is_escaped i32)

    (local.set $start (local.get $i))
    (local.set $ascii_vec (i8x16.splat (i32.const 128)))
    (local.set $quote_vec (i8x16.splat (i32.const 34)))

    (block $done
      (loop $chunk_loop
        ;; i + 16 < length
        (br_if $done
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 16))
            (local.get $len)
          )
        )

        (local.set $data_vec (v128.load (local.get $i)))

        ;; non‑ASCII bytes (>= 128)
        (local.tee $non_ascii_mask
          (i8x16.bitmask
            (i8x16.ge_u (local.get $data_vec) (local.get $ascii_vec))
          ))
        if (return (i32.add (local.get $i) (i32.ctz (local.get $non_ascii_mask)))) end

        ;; double quotes
        (i32.eqz 
          (i8x16.bitmask
            (i8x16.eq (local.get $data_vec) (local.get $quote_vec))
          ))

        ;; nothing found, skip the whole chunk
        if
          (local.set $i (i32.add (local.get $i) (i32.const 16)))
          (br $chunk_loop)
        end

        ;; scan the chunk to find the first unescaped quote
        (if (i32.ge_s 
          (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 16)))
          (i32.const 0)
        )
          (then 
            (global.set $string_len (local.get $i))
            (return (local.get $i))
          )
        )
        
        ;; chunk fully scanned without returning -> advance to next chunk
        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $chunk_loop)
      )
    )

    (block $tail_done
      (loop $tail_loop
        (br_if $tail_done (i32.ge_u (local.get $i) (local.get $len)))
        (local.set $byte (i32.load8_u (local.get $i)))

        ;; non‑ASCII
        (if (i32.ge_u (local.get $byte) (i32.const 128))
          (then
            (return (local.get $i))
          )
        )

        ;; quote
        (if (i32.eq (local.get $byte) (i32.const 34))
          (then
            (local.set $j (local.get $i))
            (local.set $is_escaped (i32.const 0))

            (block $backslash_tail
              (loop $backslash_tail_loop
                (local.set $j (i32.sub (local.get $j) (i32.const 1)))
                (br_if $backslash_tail
                  (i32.lt_s (local.get $j) (local.get $start))
                )
                (br_if $backslash_tail
                  (i32.ne (i32.load8_u (local.get $j)) (i32.const 92))
                )
                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                (br $backslash_tail_loop)
              )
            )

            (if (i32.eqz (local.get $is_escaped))
              (then
                (return (local.get $i))
              )
            )
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $tail_loop)
      )
    )

    (return (local.get $len))
  )

  (func $find_unescaped_quote (param $i i32) (param $len i32) (result i32)
    (local $start i32)
    (local $byte i32)
    (local $j i32)
    (local $is_escaped i32)
    
    (local.set $start (local.get $i))

    (block $scan_done
      (loop $scan_loop
        (br_if $scan_done
          (i32.ge_u (local.get $i) (local.get $len))
        )

        (local.set $byte (i32.load8_u (local.get $i)))

        ;; quote -> check if escaped
        (if (i32.eq (local.get $byte) (i32.const 34))
          (then
            (local.set $j (local.get $i))
            (local.set $is_escaped (i32.const 0))

            ;; count consecutive backslashes before the quote
            (block $backslash_loop
              (loop $backslash
                ;; j -= 1
                (local.set $j (i32.sub (local.get $j) (i32.const 1)))

                ;; if j < start
                (br_if $backslash_loop
                  (i32.lt_s (local.get $j) (local.get $start))
                )

                ;; stop if current byte is not a backslash
                (br_if $backslash_loop
                  (i32.ne (i32.load8_u (local.get $j)) (i32.const 92))
                )

                ;; is_escaped != is_escaped
                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                (br $backslash)
              )
            )

            ;; if not escaped, the prefix ends here
            (if (i32.eqz (local.get $is_escaped))
              (then 
                (global.set $string_len (local.get $i))
                (return (local.get $i))
              )
            )
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan_loop)
      )
    )

    i32.const -1
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