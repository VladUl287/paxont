(module
  (memory (export "memory") 1 128)

  (global $ascii_only (mut i32) (i32.const 0))
  (global $ascii_length (mut i32) (i32.const 0))
  (global $ascii_prefix_length (mut i32) (i32.const 0))
  (global $utf16_length (mut i32) (i32.const 0))

  (func (export "ascii_only") (result i32)
    (global.get $ascii_only))

  (func (export "ascii_length") (result i32)
    (global.get $ascii_length))

  (func (export "ascii_prefix_length") (result i32)
    (global.get $ascii_prefix_length))

  (func (export "utf16_length") (result i32)
    (global.get $utf16_length))

  (func (export "utf8_to_utf16") (param $utf8_ptr i32) (param $utf8_len i32) (param $utf16_ptr i32) (result i32)
    (local $i i32)
    (local $ascii_length i32)
    (local $ascii v128)
    (local $zero v128)
    (local $double_quote v128)
    (local $mask i32)
    (local $temp i32)
    (local $chunk i64)
    (local $t0 i64)
    (local $temp_v128 v128)
    (local $utf16_v128 v128)

    (global.set $ascii_only (i32.const 0))
    (global.set $ascii_length (i32.const 0))
    (global.set $ascii_prefix_length (i32.const 0))
    (global.set $utf16_length (i32.const 0))

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

    (local.tee $ascii_length 
      (call $parse_ascii_prefix (local.get $i) (local.get $utf8_len))
    )

    if
      (if (global.get $ascii_only) 
        (then
          (global.set $ascii_length (local.get $ascii_length))
          (global.set $ascii_prefix_length (local.get $ascii_length))
          (return (local.get $ascii_length))
        )
      )

      (i32.eq (local.get $ascii_length) (local.get $utf8_len))
      if (return (i32.const -1)) end
    end

    ;; non ascii block
    (block $non_ascii_block
      (loop $non_ascii_loop
        ;; i + 8 < length
        (br_if $non_ascii_block
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 8))
            (local.get $utf8_len)
          )
        )

        (local.set $chunk (i64.load offset=0 align=1 (local.get $i)))
        (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
        
        ;; all ascii
        (i64.eq 
          (i64.and 
            (local.get $chunk) 
            (i64.const 0x8080808080808080)) 
          (i64.const 0))
        if
          ;; detect quotes: byte == 0x22
          (local.set $t0 (i64.xor (local.get $chunk) (i64.const 0x2222222222222222)))
          (local.set $t0 (i64.and (i64.sub (local.get $t0) (i64.const 0x0101010101010101)) (i64.const 0x8080808080808080)))

          ;; no quotes at all, write UTF-16 and continue
          (if (i64.eqz (local.get $t0))
            (then
              (local.set $temp_v128 (i8x16.splat (i32.const 0)))
              (local.set $temp_v128 (i64x2.replace_lane 0 (local.get $temp_v128) (local.get $chunk)))
              (local.set $utf16_v128 (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
              (v128.store (local.get $utf16_ptr) (local.get $utf16_v128))
              
              (local.set $i (i32.add (local.get $i) (i32.const 8)))
              (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 16)))
              (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 8)))
              (br $non_ascii_loop)
            )
          )

          (local.set $temp (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 8))))
          (if (i32.ge_u (local.get $temp) (i32.const 0))
            (then
              (global.set $utf16_length (i32.add (local.get $utf16_ptr) (local.get $temp)))
              (return (i32.add (local.get $i) (local.get $temp))))
          )

          (local.set $temp_v128 (i8x16.splat (i32.const 0)))
          (local.set $temp_v128 (i64x2.replace_lane 0 (local.get $temp_v128) (local.get $chunk)))
          (local.set $utf16_v128 (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
          (v128.store (local.get $utf16_ptr) (local.get $utf16_v128))

          (local.set $i (i32.add (local.get $i) (i32.const 8)))
          (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 16)))
          (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 8)))
          (br $non_ascii_loop)
        end

        (i32.eq 
          (i32.and 
            (local.get $mask) 
            (i32.const 0x80808080)) 
          (i32.const 0))
        if
          (i32.and 
            (i32.xor 
              (i32.sub 
                (local.tee $temp 
                  (i32.xor (local.get $mask) (i32.const 0x22222222)))
                (i32.const 0x01010101))
              (local.get $temp))
            (i32.const 0x80808080))
          if
            (local.set $temp (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 4))))
            (if (i32.ge_u (local.get $temp) (i32.const 0))
              (then 
                (global.set $utf16_length (local.get $utf16_ptr))
                (return (local.get $i)))
            )
          end
          
          ;; store 8 bytes
          (local.set $temp_v128 (i32x4.splat (local.get $mask)))
          (local.set $utf16_v128 (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
          (v128.store64_lane 0 (local.get $utf16_ptr) (local.get $utf16_v128))

          (local.set $i (i32.add (local.get $i) (i32.const 4)))
          (local.set $utf16_ptr (i32.add (local.get $i) (i32.const 8)))
          (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 4)))
          br $non_ascii_loop
        end

        ;; check if the first byte is ascii
        (if (i32.eqz (i32.and (local.get $mask) (i32.const 0x80))) 
          (then
            ;; get first byte value
            (local.set $temp (i32.and (local.get $mask) (i32.const 0xFF)))

            ;; if byte is quote
            (if (i32.eq (local.get $temp) (i32.const 34)) 
              (then
                (if (i32.ge_u (call $find_unescaped_quote (local.get $i) (local.get $i)) (i32.const 0))
                  (then
                    (global.set $utf16_length (local.get $utf16_ptr)) 
                    (return (local.get $i)))
                )
              )
            )

            (i32.store (local.get $utf16_ptr) (local.get $temp))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 1)))

            ;; check if the second byte is ascii
            (if (i32.eqz (i32.and (local.get $mask) (i32.const 0x8000))) 
              (then
                ;; get second byte value
                (local.set $temp (i32.and (i32.shr_u (local.get $mask) (i32.const 8)) (i32.const 0xFF)))

                ;; if byte is quote
                (if (i32.eq (local.get $temp) (i32.const 34)) 
                  (then
                    (if (i32.ge_u (call $find_unescaped_quote (local.get $i) (local.get $i)) (i32.const 0))
                      (then 
                        (global.set $utf16_length (local.get $utf16_ptr))
                        (return (local.get $i)))
                    )
                  )
                )
            
                (i32.store (local.get $utf16_ptr) (local.get $temp))
                (local.set $i (i32.add (local.get $i) (i32.const 1)))
                (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 1)))

                ;; check if the third byte is ascii
                (if (i32.eqz (i32.and (local.get $mask) (i32.const 0x800000))) 
                  (then
                    ;; get second byte value
                    (local.set $temp (i32.and (i32.shr_u (local.get $mask) (i32.const 16)) (i32.const 0xFF)))
    
                    ;; if byte is quote
                    (if (i32.eq (local.get $temp) (i32.const 34)) 
                      (then
                        (if (i32.ge_u (call $find_unescaped_quote (local.get $i) (local.get $i)) (i32.const 0))
                          (then 
                            (global.set $utf16_length (local.get $utf16_ptr))
                            (return (local.get $i)))
                        )
                      )
                    )

                    (i32.store (local.get $utf16_ptr) (local.get $temp))
                    (local.set $i (i32.add (local.get $i) (i32.const 1)))
                    (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 1)))
                  )
                )
              )
            )

            (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
          )
        )

        ;; two byte value
        (i32.eq 
          (i32.and 
            (i32.sub 
              (local.get $mask) 
              (i32.const 32960)) 
            (i32.const 49376))
          (i32.const 0)
        )
        if 
          (call $in_range_inclusive
            (i32.and (local.get $mask) (i32.const 0xC0FF0000))
            (i32.const 2160197632)
            (i32.const 2162098176)
          )
          if
            (i32.store 
              (local.get $utf16_ptr) 
              (call $get_chars_from_two_byte_seq (local.get $mask)))
            
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 4)))
            (local.set $i (i32.add (local.get $i) (i32.const 4)))
            br $non_ascii_loop
          end

          (i32.store 
            (local.get $utf16_ptr) 
            (call $get_char_two_byte_seq (local.get $mask)))
      
          (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
          (local.set $i (i32.add (local.get $i) (i32.const 2)))
          br $non_ascii_loop
        end

        ;; three byte value
        (i32.eq
          (i32.and 
            (i32.sub 
              (local.get $mask) 
              (i32.const 8421600)) 
            (i32.const 12632304))
          (i32.const 0)
        )

        if
          (i32.eqz
            (i32.or
              (i32.eqz (i32.and (local.get $mask) (i32.const 0x200F)))
              (i32.eqz (i32.and (i32.sub (local.get $mask) (i32.const 8205)) (i32.const 0x200F)))
            )
          )
          if
            (i32.store 
              (local.get $utf16_ptr) 
              (call $get_char_from_three_byte_seq (local.get $mask)))
  
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 3)))
            br $non_ascii_loop
          end
        end

        ;; four byte value
        (i32.eq
          (i32.and 
            (i32.sub 
              (local.get $mask) 
              (i32.const 2155905264)) 
            (i32.const 3233857784))
          (i32.const 0))
        if
          (call $in_range_inclusive
            (call $rotate_r 
              (i32.and (local.get $mask) (i32.const 0xFFFF))
              (i32.const 8)
            )
            (i32.const 4026531984)
            (i32.const 4093640847)
          )
          if
            (i32.store 
              (local.get $utf16_ptr) 
              (call $get_chars_from_four_byte_seq (local.get $mask)))
  
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 3)))
            br $non_ascii_loop
          end
        end

        br $non_ascii_block
      )
    )
    
    (block $non_ascii_tail
      (loop $non_ascii_loop_tail
        ;; i + 1 < length
        (br_if $non_ascii_tail
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 1))
            (local.get $utf8_len)
          )
        )
        
        (if (i32.le_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 127))
          (then
            (if (i32.eq (local.get $temp) (i32.const 34)) 
              (then
                (if (i32.ge_u (call $find_unescaped_quote (local.get $i) (local.get $i)) (i32.const 0))
                  (then 
                    (global.set $utf16_length (local.get $utf16_ptr))
                    (return (local.get $i)))
                )
              )
            )

            (i32.store16 (local.get $utf16_ptr) (local.get $temp))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
            (local.set $ascii_length (i32.add (local.get $ascii_length) (i32.const 1)))
            br $non_ascii_loop_tail
          )
        )

        (if (i32.lt_u (local.get $temp) (i32.const 224))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 1)) (local.get $utf8_len)) 
              (then (return (i32.const -1)))
            )
            (if (i32.gt_u (i32.add (local.get $i) (i32.const 1)) (i32.const 191)) 
              (then (return (i32.const -1)))
            )

            (i32.store16
              (local.get $utf16_ptr)
              (i32.or
                (i32.shl (i32.and (local.get $temp) (i32.const 0x1F)) (i32.const 6))
                (i32.and 
                  (i32.load8_u (i32.add (local.get $i) (i32.const 1)))
                  (i32.const 0x3F)
                ))
            )
            
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 2)))
            br $non_ascii_loop_tail
          )
        )

        (if (i32.lt_u (local.get $temp) (i32.const 240))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 2)) (local.get $utf8_len)) 
              (then (return (i32.const -1)))
            )
            (if (i32.or 
              (i32.gt_u (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 191)) 
              (i32.gt_u (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 191)))
              (then (return (i32.const -1)))
            )

            (i32.store16
              (local.get $utf16_ptr)
              (i32.or
                (i32.or
                  (i32.shl (i32.and (local.get $temp) (i32.const 0x0F)) (i32.const 12))
                  (i32.shl (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x3F)) (i32.const 6))
                )
                (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x3F))
              )
            )
            
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 3)))
            br $non_ascii_loop_tail
          )
        )
      )
    )

    i32.const -1
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
          (local.tee $byte 
            (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 16))))
          (i32.const 0)
        )
          (then 
            (global.set $ascii_only (i32.const 1))
            (return (i32.add (local.get $i) (local.get $byte)))
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
                (global.set $ascii_only (i32.const 1))
                (return (local.get $i))
              )
            )
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $tail_loop)
      )
    )

    local.get $i
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
              (then (return (local.get $i)))
            )
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan_loop)
      )
    )

    i32.const -1
  )
 
  (func $rotate_r (param $value i32) (param $offset i32) (result i32)
    (i32.or
      (i32.shr_u (local.get $value) (local.get $offset))
      (i32.shl (local.get $value) (i32.sub (i32.const 32) (local.get $value)))
    )
  )

  (func $get_char_two_byte_seq (param $value i32) (result i32)
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

  (func $get_chars_from_two_byte_seq (param $value i32) (result i32)
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

  (func $get_char_from_three_byte_seq (param $value i32) (result i32)
    (i32.or
      (i32.or
        (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F0000)) (i32.const 16))
        (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F00)) (i32.const 2))
      )
      (i32.shl (i32.and (local.get $value) (i32.const 0xF)) (i32.const 12))
    )
  )

  (func $get_chars_from_four_byte_seq (param $value i32) (result i32)
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

  (func $in_range_inclusive (param $value i32) (param $lowerBound i32) (param $upperBound i32) (result i32)
    (i32.le_s
      (i32.sub (local.get $value) (local.get $lowerBound))
      (i32.sub (local.get $upperBound) (local.get $lowerBound))
    )
  )
)