(module
  (import "env" "memory" (memory 1 128))
  (export "memory" (memory 0))

  (global $ascii_only (mut i32) (i32.const 0))
  (global $dq_index (mut i32) (i32.const -1))
  (global $utf16_length (mut i32) (i32.const 0))

  (func (export "ascii_only") (result i32)
    (global.get $ascii_only))

  (func (export "dq_index") (result i32)
    (global.get $dq_index))

  (func (export "utf16_length") (result i32)
    (global.get $utf16_length))

  (func (export "utf8_to_utf16") (param $i i32) (param $len i32) (param $utf16_ptr i32) (result i32)
    (local $mask i32)
    (local $temp i32)
    (local $temp_v128 v128)
    (local $quote_vec v128)
    (local $byte_mask i32)
    (local $trailing i32)
    (local $byte_count i32)
    
    (local.set $quote_vec (i8x16.splat (i32.const 34)))

    (global.set $ascii_only (i32.const 0))
    (global.set $utf16_length (i32.const 0))

    (if (i32.gt_u
      (local.tee $temp (call $parse_ascii_prefix (local.get $i) (local.get $len) (i32.const -1)))
      (local.get $i))
      (then
        (if (i32.ge_u (global.get $dq_index) (i32.const 0))
          (then (return (global.get $dq_index))))

        (if (i32.eq (local.get $temp) (local.get $len))
          (then
            (global.set $ascii_only (i32.const 1))
            (return (local.get $temp))))

        (call $extend_ascii_block (local.get $i) (local.get $temp) (local.get $utf16_ptr))
        
        (local.set $utf16_ptr 
          (i32.add (local.get $utf16_ptr) (i32.shl (i32.sub (local.get $temp) (local.get $i)) (i32.const 1))))
        (local.set $i (local.get $temp))
      ))

    ;; non ascii block
    (block $non_ascii_block
      (loop $non_ascii_loop
        (if (i32.lt_u (i32.load8_u (local.get $i)) (i32.const 128)) 
          (then
            (local.set $temp (call $parse_ascii_prefix (local.get $i) (local.get $len) (local.get $utf16_ptr)))

            (local.set $utf16_ptr 
                (i32.add 
                  (local.get $utf16_ptr) 
                  (i32.shl (i32.sub (local.get $temp) (local.get $i)) (i32.const 1))))

            (local.set $i (local.get $temp))

            (if (global.get $dq_index)
              (then
                (global.set $utf16_length (local.get $utf16_ptr))
                (return (global.get $dq_index))
              ))
          ))

        ;; two byte value
        (i32.lt_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 224))
        if
          (block $two_byte_block
            (loop $two_byte_loop 
              (i32.lt_u
                (i32.add (local.get $i) (i32.const 16))
                (local.get $len)
              )
              if
                (local.set $byte_mask
                  (i8x16.bitmask
                    (i16x8.eq
                      (v128.and
                        (local.tee $temp_v128 (v128.load (local.get $i)))
                        (v128.const i16x8 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0))
                      (v128.const i16x8 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0))))
  
                (if (i32.eq (local.get $byte_mask) (i32.const 0xFFFF))
                  (then
                    (v128.store
                      (local.get $utf16_ptr) (call $decode_8_two_byte_sequences (local.get $temp_v128)))
  
                    (local.set $i (i32.add (local.get $i) (i32.const 16)))
                    (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 16)))
  
                    (br $two_byte_loop)
                  )
                )
  
                (local.set $trailing
                  (i32.ctz
                    (i32.xor (local.get $byte_mask) (i32.const 0xFFFF))))
  
                (if (i32.eq (local.get $trailing) (i32.const 32))
                  (then (local.set $byte_count (i32.const 16)))
                  (else (local.set $byte_count (local.get $trailing)))
                )
                
                (br_if $non_ascii_loop (i32.eqz (local.get $byte_count)))
  
                (v128.store
                  (local.get $utf16_ptr) (call $decode_8_two_byte_sequences (local.get $temp_v128)))
  
                (local.set $i (i32.add (local.get $i) (local.get $byte_count)))
                (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (local.get $byte_count)))
  
                (if (i32.lt_u (i32.load8_u (local.get $i)) (i32.const 128)) 
                  (then
                    (i32.store16 (local.get $utf16_ptr) (i32.load8_u (local.get $i)))
                    (local.set $i (i32.add (local.get $i) (i32.const 1)))
                    (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
                  ))
  
                (br $two_byte_loop)
              end
  
              (br_if $non_ascii_block
                (i32.gt_u
                  (i32.add (local.get $i) (i32.const 4))
                  (local.get $len)
                )
              )

              (local.set $mask (i32.load offset=0 align=1 (local.get $i)))

              (i32.eqz
                (i32.eq 
                  (i32.and 
                    (i32.sub 
                      (local.get $mask) 
                      (i32.const 32960)) 
                    (i32.const 49376))
                  (i32.const 0)))
              br_if $two_byte_block
  
              (call $in_range_inclusive
                (i32.and (local.get $mask) (i32.const 0xC0FF0000))
                (i32.const 2160197632)
                (i32.const 2162098176)
              )
              if
                (i32.store 
                  (local.get $utf16_ptr) 
                  (call $get_chars_from_two_byte_seq (local.get $mask)))
  
                (local.set $i (i32.add (local.get $i) (i32.const 4)))
                (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 4)))
                (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
  
                (br_if $non_ascii_loop
                  (i32.gt_u
                    (i32.add (local.get $i) (i32.const 4))
                    (local.get $len)
                  )
                )
  
                br $two_byte_loop
              end
  
              (i32.store16 
                (local.get $utf16_ptr) 
                (call $get_char_two_byte_seq (local.get $mask)))
  
              (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
              (local.set $i (i32.add (local.get $i) (i32.const 2)))
              br $non_ascii_loop
            ))
        end

        ;; i + 4 < length
        (br_if $non_ascii_block
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 4))
            (local.get $len)
          ))

        (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
        
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
  
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 4)))
            (local.set $i (i32.add (local.get $i) (i32.const 4)))
            br $non_ascii_loop
          end
        end

        (br $non_ascii_block)
      )
    )
    
    (block $non_ascii_tail
      (loop $non_ascii_loop_tail
        ;; i + 1 < length
        (br_if $non_ascii_tail
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 1))
            (local.get $len)
          )
        )
        
        (if (i32.lt_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 128))
          (then
            (if (i32.eq (local.get $temp) (i32.const 34)) 
              (then
                (if (i32.ge_u (local.tee $temp (call $find_unescaped_quote (local.get $i) (local.get $i))) (i32.const 0))
                  (then 
                    (global.set $utf16_length (local.get $utf16_ptr))
                    (return (local.get $temp)))
                )
              )
            )

            (i32.store16 (local.get $utf16_ptr) (local.get $temp))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (local.set $utf16_ptr (i32.add (local.get $utf16_ptr) (i32.const 2)))
            br $non_ascii_loop_tail
          )
        )

        (if (i32.lt_u (local.get $temp) (i32.const 224))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 1)) (local.get $len)) 
              (then (return (i32.const -1)))
            )
            (if (i32.gt_u (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 191)) 
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
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 2)) (local.get $len)) 
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

  (func $extend_ascii_block (param $src i32) (param $len i32) (param $target i32)
    (local $i i32)
    (local $temp_v128 v128)
    
    (local.set $i (i32.const 0))
    
    (block $extend_ascii_block
      (loop $extend_ascii_simd
        ;; i + 16 < length
        (br_if $extend_ascii_block
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 16))
            (local.get $len)
          ))

        (local.set $temp_v128 (v128.load (i32.add (local.get $src) (local.get $i))))

        (v128.store (local.get $target) (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
        (local.set $target (i32.add (local.get $target) (i32.const 16)))
        (v128.store (local.get $target) (i16x8.extend_high_i8x16_u (local.get $temp_v128)))
        (local.set $target (i32.add (local.get $target) (i32.const 16)))

        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $extend_ascii_simd)
      )
    )

    (block $extend_ascii_block
      (loop $extend_ascii_scalar
        ;; i + 1 < length
        (br_if $extend_ascii_block
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 1))
            (local.get $len)
          ))

        (i32.store16 
          (local.get $target) 
          (i32.load8_u (i32.add (local.get $src) (local.get $i))))

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (local.set $target (i32.add (local.get $target) (i32.const 2)))
        (br $extend_ascii_scalar)
      )
    )
  )

  (func $decode_8_two_byte_sequences (param $input v128) (result v128)  
    (local $leads v128)
    (local $conts v128)
  
    (local.set $leads
      (v128.and (local.get $input) (v128.const i16x8 0x001F 0x001F 0x001F 0x001F 0x001F 0x001F 0x001F 0x001F)))
  
    (local.set $leads
      (i16x8.shl (local.get $leads) (i32.const 6)))
  
    (local.set $conts
      (i16x8.shr_u (local.get $input) (i32.const 8)))
  
    (local.set $conts
      (v128.and (local.get $conts) (v128.const i16x8 0x003F 0x003F 0x003F 0x003F 0x003F 0x003F 0x003F 0x003F)))
  
    (v128.or (local.get $leads) (local.get $conts))
  )

  (func $parse_ascii_prefix (param $i i32) (param $len i32) (param $target i32) (result i32)
    (local $temp i32)
    (local $byte_count i32)
    (local $trailing i32)
    (local $byte i32)
    (local $temp_v128 v128)
    (local $ascii_vec v128)          
    (local $quote_vec v128)

    (local.set $ascii_vec (i8x16.splat (i32.const 128)))
    (local.set $quote_vec (i8x16.splat (i32.const 34)))

    (block $ascii_byte_block
      (loop $ascii_byte_loop
        ;; if (i + 16 < length)
        (if (i32.lt_u (i32.add (local.get $i) (i32.const 16)) (local.get $len))
          (then
            (local.set $byte
              (i8x16.bitmask
                (i8x16.ge_s
                  (local.tee $temp_v128 (v128.load (local.get $i)))
                  (i8x16.splat (i32.const 0))
                )))

            (local.set $trailing
              (i32.ctz (i32.xor (local.get $byte) (i32.const 0xFFFF))))

            (if (i32.eq (local.get $trailing) (i32.const 32))
              (then (local.set $byte_count (i32.const 16)))
              (else (local.set $byte_count (local.get $trailing)))
            )

            ;; double quotes
            (if (i8x16.bitmask (i8x16.eq (local.get $temp_v128) (local.get $quote_vec)))
              (then 
                (if (i32.ge_u
                    (local.tee $temp 
                      (call $find_unescaped_quote 
                        (local.get $i) 
                        (i32.add 
                          (local.get $i) 
                          (local.get $byte_count))))
                    (i32.const 0))
                  (then
                    (local.set $byte_count (i32.sub (local.get $i) (local.get $temp)))

                    (if (i32.gt_s (local.get $target) (i32.const -1))
                      (then
                        (v128.store (local.get $target) (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
                        (v128.store (i32.add (local.get $target) (i32.const 16)) (i16x8.extend_high_i8x16_u (local.get $temp_v128)))
                        (local.set $target (i32.add (local.get $target) (i32.shl (local.get $byte_count) (i32.const 1))))
                      ))

                    (return (local.get $temp))
                  ))))
    
            (if (i32.eqz (local.get $byte_count)) (then (return (local.get $i))))

            (if (i32.gt_s (local.get $target) (i32.const -1))
              (then
                (v128.store (local.get $target) (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
                (v128.store (i32.add (local.get $target) (i32.const 16)) (i16x8.extend_high_i8x16_u (local.get $temp_v128)))
                (local.set $target (i32.add (local.get $target) (i32.shl (local.get $byte_count) (i32.const 1))))
              ))
          
            (local.set $i (i32.add (local.get $i) (local.get $byte_count)))
            
            (br_if $ascii_byte_loop (i32.eq (local.get $byte_count) (i32.const 16)))
            (return (local.get $i))
          ))

        ;; if (i + 4 < length)
        (if (i32.lt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len))
          (then
            (local.set $byte (i32.load offset=0 align=1 (local.get $i)))

            (if (i32.eq (i32.and (local.get $byte) (i32.const 0x80808080)) (i32.const 0)) 
              (then 
                (if (i32.gt_s 
                    (local.tee $temp (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 4))))
                    (i32.const 0))
                  (then
                    (if (i32.gt_s (local.get $target) (i32.const -1))
                      (then
                        (local.set $temp_v128 (i32x4.splat (local.get $byte)))
                        (local.set $temp_v128 (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
                        (v128.store64_lane 0 (local.get $target) (local.get $temp_v128))
                        (local.set $target (i32.add (local.get $target) (i32.const 8)))
                      ))

                    (return (local.get $temp))
                  ))

                (if (i32.gt_s (local.get $target) (i32.const -1))
                  (then
                    (local.set $temp_v128 (i32x4.splat (local.get $byte)))
                    (local.set $temp_v128 (i16x8.extend_low_i8x16_u (local.get $temp_v128)))
                    (v128.store64_lane 0 (local.get $target) (local.get $temp_v128))
                    (local.set $target (i32.add (local.get $target) (i32.const 8)))
                  ))

                (local.set $i (i32.add (local.get $i) (i32.const 4)))
                (br $ascii_byte_loop)
              ))
          ))

        (block $ascii_tail_block
          (loop $ascii_tail_loop
            ;; if (i < length)
            (br_if $ascii_tail_block (i32.ge_u (local.get $i) (local.get $len)))

            (local.set $byte (i32.load8_u (local.get $i)))
  
            (if (i32.ge_u (local.get $byte) (i32.const 128))
              (then (return (local.get $i))))

            (if (i32.and 
                (i32.eq (local.get $byte) (i32.const 34))
                (i32.gt_s 
                  (local.tee $temp (call $find_unescaped_quote (local.get $i) (local.get $i))) 
                  (i32.const 0)))
              (then
                (if (i32.gt_s (local.get $target) (i32.const -1))
                  (then
                    (i32.store16 (local.get $target) (local.get $byte))
                    (local.set $target (i32.add (local.get $target) (i32.const 2)))
                  ))

                (return (local.get $temp))
              ))

            (if (i32.gt_s (local.get $target) (i32.const -1))
              (then
                (i32.store16 (local.get $target) (local.get $byte))
                (local.set $target (i32.add (local.get $target) (i32.const 2)))
              ))

            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $ascii_tail_loop)
          ))

        (return (local.get $i))
      ))
    (return (local.get $i))
  )

  (func $find_unescaped_quote (param $i i32) (param $len i32) (result i32)
    (local $start i32)
    (local $byte i32)
    (local $j i32)
    (local $is_escaped i32)
    
    (global.set $dq_index (i32.const -1))

    (local.set $start (local.get $i))

    (block $scan_done
      (loop $scan_loop
        (br_if $scan_done
          (i32.gt_u (local.get $i) (local.get $len)))

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
                (global.set $dq_index (local.get $i))
                (return (local.get $i)))
            )
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan_loop)
      ))
    (return (i32.const -1))
  )
 
  (func $rotate_r (param $value i32) (param $offset i32) (result i32)
    (i32.or
      (i32.shr_u (local.get $value) (local.get $offset))
      (i32.shl (local.get $value) (i32.sub (i32.const 32) (local.get $offset)))
    )
  )

  (func $get_char_two_byte_seq (param $value i32) (result i32)
    (i32.sub
      (i32.sub
        (i32.add
          (i32.and 
            (i32.shr_u (local.get $value) (i32.const 8)) 
            (i32.const 0xFF))
          (i32.shl
            (i32.and (local.get $value) (i32.const 0xFF))
            (i32.const 6)))
      (i32.const 12288))
    (i32.const 128))
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
    (return (i32.add (local.get $result) (i32.const 0xDC000000)))
  )

  (func $in_range_inclusive (param $value i32) (param $lowerBound i32) (param $upperBound i32) (result i32)
    (i32.le_u
      (i32.sub (local.get $value) (local.get $lowerBound))
      (i32.sub (local.get $upperBound) (local.get $lowerBound))
    )
  )
)