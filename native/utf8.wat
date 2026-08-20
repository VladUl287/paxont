(module
  (import "env" "memory" (memory 1 128))
  (export "memory" (memory 0))

  (global $ascii_only (mut i32) (i32.const 0))
  (global $dq_index (mut i32) (i32.const -1))

  (func (export "ascii_only") (result i32)
    (global.get $ascii_only))

  (func (export "dq_index") (result i32)
    (global.get $dq_index))

  (func (export "utf8_to_utf8") (param $i i32) (param $len i32) (param $partial i32) (result i32)
    (local $mask i32)
    (local $temp i32)
    (local $temp_v128 v128)
    (local $quote_vec v128)
    (local $byte_mask i32)
    (local $trailing i32)
    (local $partialChar i32)

    (global.set $dq_index (i32.const -1))
    (global.set $ascii_only (i32.const 1))

    (local.set $quote_vec (i8x16.splat (i32.const 34)))

    (block $non_ascii_block
      (loop $non_ascii_loop
        (if (i32.lt_u (i32.load8_u (local.get $i)) (i32.const 128)) 
          (then
            (local.tee $temp (call $parse_ascii (local.get $i) (local.get $len)))
            (local.set $i)

            (if (i32.ge_s (global.get $dq_index) (i32.const 0))
              (then (return (global.get $dq_index))))

            (if (i32.eq (local.get $temp) (local.get $len))
              (then (return (local.get $temp))))
          ))

        (global.set $ascii_only (i32.const 0))

        ;; two byte value
        (if (i32.lt_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 224))
          (then
            (block $two_byte_block
              (loop $two_byte_loop 
                ;; i + 16 < len
                (if (i32.lt_u (i32.add (local.get $i) (i32.const 16)) (local.get $len))
                  (then 
                    (local.set $byte_mask
                      (i8x16.bitmask
                        (i16x8.eq
                          (v128.and
                            (local.tee $temp_v128 (v128.load (local.get $i))) 
                            (v128.const i16x8 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0))
                          (v128.const i16x8 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0))))
  
                    (if (i32.eq (local.get $byte_mask) (i32.const 0xFFFF))
                      (then
                        (local.set $i (i32.add (local.get $i) (i32.const 16)))
                        (br $two_byte_loop)
                      ))
  
                    (local.set $trailing (i32.ctz (i32.xor (local.get $byte_mask) (i32.const 0xFFFF))))

                    (local.set $i (i32.add (local.get $i) (local.get $trailing)))
                    (br $non_ascii_loop)
                  ))
  
                ;; i + 4 < len
                (if (i32.lt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len))
                  (then 
                    (local.set $mask (i32.load offset=0 align=1 (local.get $i)))

                    (br_if $two_byte_block
                      (i32.ne
                        (i32.and (i32.sub (local.get $mask) (i32.const 32960)) (i32.const 49376))
                        (i32.const 0)))

                    (if (call $in_range_inclusive
                      (i32.and (local.get $mask) (i32.const 0xC0FF0000))
                      (i32.const 2160197632)
                      (i32.const 2162098176)) 
                      (then
                        (local.set $i (i32.add (local.get $i) (i32.const 4)))
                        (br $two_byte_loop)
                      ))

                    (local.set $i (i32.add (local.get $i) (i32.const 2)))
                    (br $non_ascii_loop)
                  ))

                (br $non_ascii_block)
              ))
          ))

        ;; i + 4 < length
        (br_if $non_ascii_block (i32.gt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len)))

        (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
        
        ;; three byte value
        (if (i32.eq (i32.and (i32.sub (local.get $mask) (i32.const 8421600)) (i32.const 12632304)) (i32.const 0)) 
          (then
            (if (i32.eqz (i32.or
              (i32.eqz (i32.and (local.get $mask) (i32.const 0x200F)))
              (i32.eqz (i32.and (i32.sub (local.get $mask) (i32.const 8205)) (i32.const 0x200F))))) 
              (then
                (local.set $i (i32.add (local.get $i) (i32.const 3)))
                (br $non_ascii_loop)
              ))
          ))

        ;; four byte value
        (if (i32.eq (i32.and (i32.sub (local.get $mask) (i32.const 2155905264)) (i32.const 3233857784)) (i32.const 0)) 
          (then
            (if (call $in_range_inclusive
              (call $rotate_r (i32.and (local.get $mask) (i32.const 0xFFFF)) (i32.const 8))
              (i32.const 4026531984)
              (i32.const 4093640847))
              (then
                (local.set $i (i32.add (local.get $i) (i32.const 4)))
                (br $non_ascii_loop)
              ))
          ))

        (if (i32.and (local.get $partial) (i32.gt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len)))
          (then (return (local.get $i)))
          (else (return (i32.const -1))))
      ))
    
    (block $non_ascii_tail
      (loop $non_ascii_loop_tail
        ;; i + 1 < length
        (br_if $non_ascii_tail (i32.gt_u (i32.add (local.get $i) (i32.const 1)) (local.get $len)))
        
        (if (i32.lt_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 128))
          (then
            (if (i32.eq (local.get $temp) (i32.const 34))
              (then
                (if (i32.ge_u (local.tee $temp (call $find_unescaped_quote (local.get $i) (local.get $i))) (i32.const 0))
                  (then (return (local.get $temp))))
              ))

            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $non_ascii_loop_tail)
          ))

        (local.set $temp (i32.sub (local.get $temp) (i32.const 194)))

        (if (i32.lt_u (local.get $temp) (i32.const 30))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 1)) (local.get $len)) 
              (then (return (local.get $i))))

            (if (i32.ge_u (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 128)) (i32.const 64)) 
              (then (return (i32.const -1))))
            
            (local.set $i (i32.add (local.get $i) (i32.const 2)))
            (br $non_ascii_loop_tail)
          )
        )

        (if (i32.lt_u (local.get $temp) (i32.const 46))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 2)) (local.get $len)) 
              (then (return (local.get $i))))
            
            (if (i32.or 
              (i32.ge_u (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 128)) (i32.const 64)) 
              (i32.ge_u (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 128)) (i32.const 64)))
              (then (return (i32.const -1))))

            (local.set $partialChar (i32.add 
                (i32.shl (local.get $temp) (i32.const 12))
                (i32.shl (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 6))
              ))

            (if (i32.or 
              (i32.lt_u (local.get $partialChar) (i32.const 133120)) 
              (i32.lt_u (i32.sub (local.get $partialChar) (i32.const 186368)) (i32.const 2048)))
              (then (return (i32.const -1))))
            
            (local.set $i (i32.add (local.get $i) (i32.const 3)))
            (br $non_ascii_loop_tail)
          )
        )
      ))

    (if (i32.and (local.get $partial) (i32.gt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len)))
      (then (return (local.get $i))))
    
    (return (i32.const -1))
  )

  (func $parse_ascii (param $i i32) (param $len i32) (result i32)
    (local $temp i32)
    (local $byte_count i32)
    (local $trailing i32)
    (local $byte i32)
    (local $temp_v128 v128)        
    (local $quote_vec v128)
    
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
                (if (i32.ge_s
                  (local.tee $temp (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (local.get $byte_count))))
                  (i32.const 0))
                  (then (return (local.get $temp)))
                )))
    
            (if (i32.eqz (local.get $byte_count)) 
              (then (return (local.get $i))))

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
                (if (i32.ge_s 
                    (local.tee $temp (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 4))))
                    (i32.const 0))
                  (then (return (local.get $temp))))

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
                (i32.ge_s 
                  (local.tee $temp (call $find_unescaped_quote (local.get $i) (local.get $i))) 
                  (i32.const 0)))
              (then (return (local.get $temp))))

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
    
    (local.set $start (local.get $i))

    (block $scan_done
      (loop $scan_loop
        (br_if $scan_done (i32.gt_u (local.get $i) (local.get $len)))

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

  (func $in_range_inclusive (param $value i32) (param $lowerBound i32) (param $upperBound i32) (result i32)
    (i32.le_u
      (i32.sub (local.get $value) (local.get $lowerBound))
      (i32.sub (local.get $upperBound) (local.get $lowerBound))
    )
  )
)