(module
  (import "env" "memory" (memory 1 128))
  (import "utils" "find_quote" (func $find_quote (param $i i32) (param $start i32) (param $end i32) (result i32)))
  
  (func $parse_ascii (param $i i32) (param $src i32) (param $len i32) (param $target i32) 
    (param $extend i32) (param $partial i32) (result i32 i32 i32 i32)
    (local $temp i32)
    (local $temp_mask i32)
    (local $byte_count i32)
    (local $byte i32)
    (local $data_vec v128)
    (local $zero_vec v128)
    (local $quote_vec v128)
    (local $backslash_vec v128)
    (local $ascii_vec v128)
    (local $start i32)
    (local $start_target i32)

    (local.set $start (local.get $i))
    (local.set $start_target (local.get $target))
    (local.set $zero_vec (i8x16.splat (i32.const 0)))
    (local.set $quote_vec (i8x16.splat (i32.const 34)))
    (local.set $backslash_vec (i8x16.splat (i32.const 92)))
    (local.set $ascii_vec (i8x16.splat (i32.const 128)))

    (block $block
      (loop $loop
        (br_if $block (i32.ge_u (i32.add (local.get $i) (i32.const 16)) (local.get $len)))

        (local.set $byte_count 
          (i32.ctz 
            (i32.xor 
              (i8x16.bitmask
                (i8x16.ge_s
                  (local.tee $data_vec (v128.load (local.get $i)))
                  (i8x16.splat (i32.const 0))
                )
              )
              (i32.const 0xFFFF)
            )
          )
        )

        (if (i32.eqz (local.get $byte_count)) 
          (then
            (if (i32.eqz (local.get $extend)) 
              (then 
                (local.set $i (local.get $start))
                (local.set $extend (i32.const 1))
                (br $loop)
              )
            )
            (return (local.get $i) (local.get $target) (i32.const -1) (i32.const 0))
          )
        )
        (if (i32.eq (local.get $byte_count) (i32.const 32))
          (then (local.set $byte_count (i32.const 16)))
        )

        (local.set $temp (i8x16.bitmask (i8x16.eq (local.get $data_vec) (local.get $backslash_vec))))
        (local.set $temp_mask (i32.and (local.get $temp) (i32.shr_u (local.get $temp) (i32.const 1))))
        (local.set $temp_mask (i32.and (local.get $temp) (i32.xor (local.get $temp_mask) (i32.const -1))))

        (if (local.get $temp_mask)
          (then 
            (if (i32.eqz (local.get $extend)) 
              (then 
                (local.set $i (local.get $start))
                (local.set $extend (i32.const 1))
                (br $loop)
              )
            )
            (local.set $extend (i32.const 1))
          )
        )

        (if (i8x16.bitmask (i8x16.eq (local.get $data_vec) (local.get $quote_vec)))
          (then 
            (if
              (i32.ge_s
                (local.tee $temp (call $find_quote (local.get $i) (local.get $src) (i32.add (local.get $i) (local.get $byte_count))))
                (i32.const 0)
              )
              (then
                (local.set $byte_count (i32.sub (local.get $i) (local.get $temp)))

                (if (local.get $extend)
                  (then
                    (if (local.get $temp_mask)
                      (then
                        (call $store_sequentially 
                          (local.get $i) 
                          (i32.add (local.get $i) (local.get $byte_count)) 
                          (local.get $len)
                          (local.get $target)
                        )
                        (local.set $target)
                        (local.set $i)
                      )
                      (else
                        (v128.store (local.get $target) (i16x8.extend_low_i8x16_u (local.get $data_vec)))
                        (v128.store (i32.add (local.get $target) (i32.const 16)) (i16x8.extend_high_i8x16_u (local.get $data_vec)))
                        (local.set $target (i32.add (local.get $target) (i32.shl (local.get $byte_count) (i32.const 1))))
                      )
                    )
                  )
                )
                
                (return (local.get $temp) (local.get $target) (local.get $temp) (i32.const 0))
              )
            )
          )
        )

        (if (local.get $extend)
          (then
            (if (local.get $temp_mask)
              (then
                (call $store_sequentially 
                  (local.get $i) 
                  (i32.add (local.get $i) (local.get $byte_count)) 
                  (local.get $len) 
                  (local.get $target)
                )
                (local.set $target)
                (local.set $i)
              )
              (else
                (v128.store (local.get $target) (i16x8.extend_low_i8x16_u (local.get $data_vec)))
                (v128.store (i32.add (local.get $target) (i32.const 16)) (i16x8.extend_high_i8x16_u (local.get $data_vec)))
                (local.set $target (i32.add (local.get $target) (i32.shl (local.get $byte_count) (i32.const 1))))
                (local.set $i (i32.add (local.get $i) (local.get $byte_count)))
              )
            )
          )
          (else (local.set $i (i32.add (local.get $i) (local.get $byte_count))))
        )
        
        (br_if $loop (i32.eq (local.get $byte_count) (i32.const 16)))

        (if (i32.eqz (local.get $extend)) 
          (then 
            (local.set $i (local.get $start))
            (local.set $extend (i32.const 1))
            (br $loop)
          )
        )

        (return (local.get $i) (local.get $target) (i32.const -1) (i32.const 0))
      )
    )

    (block $tail_block
      (loop $tail_loop
        (br_if $tail_block (i32.ge_u (local.get $i) (local.get $len)))

        (local.set $byte (i32.load8_u (local.get $i)))
  
        (if (i32.ge_u (local.get $byte) (i32.const 128))
          (then
            (if (i32.eqz (local.get $extend))
              (then 
                (return (call $parse_ascii (local.get $start) (local.get $src) (local.get $len) 
                  (local.get $start_target) (local.get $partial) (i32.const 1)))
              )
              (else (return (local.get $i) (local.get $target) (i32.const -1) (i32.const 0)))
            )
          )
        )

        (if (i32.eq (local.get $byte) (i32.const 34))
          (then
            (if (i32.ge_s (local.tee $temp (call $find_quote (local.get $i) (local.get $start) (local.get $i))) (i32.const 0))
              (then (return (local.get $temp) (local.get $target) (local.get $temp) (i32.const 0)))
            )
          )
        )

        (local.set $temp_mask (i32.const 0))

        (if (i32.eq (local.get $byte) (i32.const 92))
          (then
            ;; TODO: check escaped or not
            (if (i32.eqz (local.get $extend)) 
              (then 
                (local.set $i (local.get $start))
                (local.set $extend (i32.const 1))
                (br $tail_loop)
              )
            )
            (local.set $temp_mask (i32.const 1))
          )
        )

        (if (local.get $extend)
          (then
            (if (local.get $temp_mask)
              (then
                (local.set $byte (local.get $i))
                (call $store_sequentially 
                  (local.get $i) (i32.add (local.get $i) (i32.const 1))
                  (local.get $len) (local.get $target)
                )
                (local.set $target)
                (local.set $i)
                (if (i32.eq (local.get $i) (local.get $byte))
                  (then
                    (if (local.get $partial)
                      (then (return (local.get $byte) (local.get $target) (i32.const -1) (i32.const 1)))
                      (else (return (i32.const -1) (i32.const -1) (i32.const -1) (i32.const 0)))
                    )
                  )
                )
                (br $tail_loop)
              )
              (else
                (i32.store16 (local.get $target) (local.get $byte))
                (local.set $target (i32.add (local.get $target) (i32.const 2)))
              )
            )
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $tail_loop)
      )
    )

    (return (local.get $i) (local.get $target) (i32.const -1) (i32.const 0))
  )

  (func $store_sequentially (param $start i32) (param $end i32) (param $len i32) (param $target i32) (result i32 i32)
    (local $i i32)
    (local $byte i32)
    (local $j i32)
    (local $code_point i32)
    (local $hex_value i32)
    (local $surrogate_high i32)

    (local.set $i (local.get $start))
    (local.set $j (local.get $target))

    (block $done
      (loop $loop
        (br_if $done
          (i32.ge_u (local.get $i) (local.get $end))
        )

        (local.set $byte (i32.load8_u (local.get $i)))

        (if (i32.eq (local.get $byte) (i32.const 0x5C))  ;; '\'
          (then
            (br_if $done
              (i32.ge_u (i32.add (local.get $i) (i32.const 1)) (local.get $len))
            )

            (local.set $i (i32.add (local.get $i) (i32.const 1)))

            (local.set $byte (i32.load8_u (local.get $i)))

            (block $escape_done
              (if (i32.eq (local.get $byte) (i32.const 0x6E))  ;; 'n'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x0A))  ;; LF
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x74))  ;; 't'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x09))  ;; TAB
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x72))  ;; 'r'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x0D))  ;; CR
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x62))  ;; 'b'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x08))  ;; Backspace
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x66))  ;; 'f'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x0C))  ;; Form feed
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x5C))  ;; '\\'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x5C))  ;; Backslash
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x22))  ;; '"'
                (then
                  (i32.store16 (local.get $j) (i32.const 0x22))  ;; Double quote
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )
              (if (i32.eq (local.get $byte) (i32.const 0x27))  ;; '\''
                (then
                  (i32.store16 (local.get $j) (i32.const 0x27))  ;; Single quote
                  (local.set $j (i32.add (local.get $j) (i32.const 2)))
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))
                  (br $escape_done)
                )
              )

              ;; unicode escape \uXXXX
              (if (i32.eq (local.get $byte) (i32.const 0x75))  ;; 'u'
                (then
                  (local.set $i (i32.add (local.get $i) (i32.const 1)))

                  (call $parse_unicode_escape (local.get $i) (local.get $len))
                  (local.set $hex_value)
                  (local.set $i)

                  (if (i32.eq (local.get $hex_value) (i32.const -1))
                    (then (return (i32.sub (local.get $i) (i32.const 2)) (local.get $j)))
                  )

                  (if 
                    (i32.and 
                      (i32.ge_u (local.get $hex_value) (i32.const 0xD800))
                      (i32.le_u (local.get $hex_value) (i32.const 0xDBFF))
                    )
                    (then
                      (local.set $surrogate_high (local.get $hex_value))

                      (block $no_low_surrogate
                        (br_if $no_low_surrogate
                          (i32.ne (i32.load8_u (local.get $i)) (i32.const 0x5C))
                        )

                        (br_if $no_low_surrogate
                          (i32.ne (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x75))
                        )

                        (local.set $i (i32.add (local.get $i) (i32.const 2)))
                        (call $parse_unicode_escape (local.get $i) (local.get $len))
                        (local.set $hex_value)
                        (local.set $i)

                        (if (i32.eq (local.get $hex_value) (i32.const -1))
                          (then (return (i32.sub (local.get $i) (i32.const 2)) (local.get $j)))
                        )

                        (if (i32.and 
                              (i32.ge_u (local.get $hex_value) (i32.const 0xDC00))
                              (i32.le_u (local.get $hex_value) (i32.const 0xDFFF))
                            )
                          (then
                            (local.set $code_point
                              (i32.or
                                (i32.shl (i32.sub (local.get $surrogate_high) (i32.const 0xD800)) (i32.const 10))
                                (i32.sub (local.get $hex_value) (i32.const 0xDC00))
                              )
                            )
                            (local.set $code_point
                              (i32.add (local.get $code_point) (i32.const 0x10000))
                            )
                            (call $store_utf16 (local.get $j) (local.get $code_point))
                            (local.set $j (i32.add (local.get $j) (i32.const 4)))
                            (br $escape_done)
                          )
                          (else
                            (i32.store16 (local.get $j) (local.get $surrogate_high))
                            (local.set $j (i32.add (local.get $j) (i32.const 2)))
                            (local.set $i (i32.sub (local.get $i) (i32.const 6)))
                            (br $escape_done)
                          )
                        )
                      )

                      (i32.store16 (local.get $j) (local.get $surrogate_high))
                      (local.set $j (i32.add (local.get $j) (i32.const 2)))
                    )
                    (else
                      (call $store_utf16 (local.get $j) (local.get $hex_value))
                      (local.set $j 
                        (i32.add 
                          (local.get $j)
                          (if (result i32) 
                            (i32.gt_u (local.get $hex_value) (i32.const 0xFFFF))
                            (then (i32.const 4))
                            (else (i32.const 2))
                          )
                        )
                      )
                    )
                  )

                  (br $escape_done)
                )
              )

              ;; unknown escape
            )
            (br $loop)
          )
        )

        (if (i32.lt_u (local.get $byte) (i32.const 0x80))
          (then
            ;; single-byte
            (i32.store16 (local.get $j) (local.get $byte))
            (local.set $j (i32.add (local.get $j) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
          )
          (else
            (if (i32.eq (i32.and (local.get $byte) (i32.const 0xE0)) (i32.const 0xC0))
              (then
                ;; 2-byte sequence
                (local.set $code_point 
                  (i32.or 
                    (i32.shl (i32.and (local.get $byte) (i32.const 0x1F)) (i32.const 6))
                    (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x3F))
                  )
                )
                (call $store_utf16 (local.get $j) (local.get $code_point))
                (local.set $j 
                  (i32.add 
                    (local.get $j)
                    (if (result i32) 
                      (i32.gt_u (local.get $code_point) (i32.const 0xFFFF))
                      (then (i32.const 4))
                      (else (i32.const 2))
                    )
                  )
                )
                (local.set $i (i32.add (local.get $i) (i32.const 2)))
              )
              (else
                (if (i32.eq (i32.and (local.get $byte) (i32.const 0xF0)) (i32.const 0xE0))
                  (then
                    ;; 3-byte sequence
                    (local.set $code_point
                      (i32.or
                        (i32.or
                          (i32.shl (i32.and (local.get $byte) (i32.const 0x0F)) (i32.const 12))
                          (i32.shl (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x3F)) (i32.const 6))
                        )
                        (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 0x3F))
                      )
                    )
                    (call $store_utf16 (local.get $j) (local.get $code_point))
                    (local.set $j
                      (i32.add 
                        (local.get $j)
                        (if (result i32) 
                          (i32.gt_u (local.get $code_point) (i32.const 0xFFFF))
                          (then (i32.const 4))
                          (else (i32.const 2))
                        )
                      )
                    )
                    (local.set $i (i32.add (local.get $i) (i32.const 3)))
                  )
                  (else
                    (if (i32.eq (i32.and (local.get $byte) (i32.const 0xF8)) (i32.const 0xF0))
                      (then
                        ;; 4-byte sequence
                        (local.set $code_point
                          (i32.or
                            (i32.or
                              (i32.or
                                (i32.shl (i32.and (local.get $byte) (i32.const 0x07)) (i32.const 18))
                                (i32.shl (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x3F)) (i32.const 12))
                              )
                              (i32.shl (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 0x3F)) (i32.const 6))
                            )
                            (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 3))) (i32.const 0x3F))
                          )
                        )
                        (call $store_utf16 (local.get $j) (local.get $code_point))
                        (local.set $j
                          (i32.add 
                            (local.get $j)
                            (if (result i32) 
                              (i32.gt_u (local.get $code_point) (i32.const 0xFFFF))
                              (then (i32.const 4))
                              (else (i32.const 2))
                            )
                          )
                        )
                        (local.set $i (i32.add (local.get $i) (i32.const 4)))
                      )
                      (else
                        ;; invalid, skip byte
                        (local.set $i (i32.add (local.get $i) (i32.const 1)))
                      )
                    )
                  )
                )
              )
            )
          )
        )
        (br $loop)
      )
    )

    (return (local.get $i) (local.get $j))
  )

  (func $parse_unicode_escape (param $pos i32) (param $end i32) (result i32 i32)
    (local $hex_value i32)
    (local $hex_digit i32)
    (local $i i32)

    (local.set $i (local.get $pos))
    (local.set $hex_value (i32.const 0))
    
    (if (i32.gt_u (i32.add (local.get $i) (i32.const 4)) (local.get $end))
      (then
        (return (local.get $i) (i32.const -1))
      )
    )

    (block $parse_digits
      (loop $digit_loop
        (local.set $hex_digit (i32.load8_u (local.get $i)))

        (if (i32.eq (call $hex_to_value (local.get $hex_digit)) (i32.const -1))
          (then
            (return (local.get $i) (i32.const -1))
          )
        )

        (local.set $hex_value 
          (i32.or 
            (i32.shl (local.get $hex_value) (i32.const 4))
            (call $hex_to_value (local.get $hex_digit))
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 1)))

        (br_if $digit_loop
          (i32.lt_u 
            (i32.sub (local.get $i) (local.get $pos))
            (i32.const 4)
          )
        )
      )
    )

    (return (local.get $i) (local.get $hex_value))
  )

  (func $hex_to_value (param $char i32) (result i32)
    (local $value i32)
    (local.set $value (i32.const -1))

    (if (i32.and (i32.ge_u (local.get $char) (i32.const 0x30)) (i32.le_u (local.get $char) (i32.const 0x39)))
      (then (local.set $value (i32.sub (local.get $char) (i32.const 0x30))))
    )
    (if (i32.and (i32.ge_u (local.get $char) (i32.const 0x41)) (i32.le_u (local.get $char) (i32.const 0x46)))
      (then (local.set $value (i32.add (i32.sub (local.get $char) (i32.const 0x41)) (i32.const 10))))
    )
    (if (i32.and (i32.ge_u (local.get $char) (i32.const 0x61)) (i32.le_u (local.get $char) (i32.const 0x66)))
      (then (local.set $value (i32.add (i32.sub (local.get $char) (i32.const 0x61)) (i32.const 10))))
    )

    (return (local.get $value))
  )

  (func $store_utf16 (param $offset i32) (param $code_point i32)
    (if (i32.gt_u (local.get $code_point) (i32.const 0xFFFF))
      (then
        (local.set $code_point (i32.sub (local.get $code_point) (i32.const 0x10000)))
        (i32.store16 (local.get $offset) 
          (i32.or (i32.const 0xD800) 
            (i32.shr_u (local.get $code_point) (i32.const 10))
          )
        )
        (i32.store16 (i32.add (local.get $offset) (i32.const 2))
          (i32.or (i32.const 0xDC00)
            (i32.and (local.get $code_point) (i32.const 0x3FF))
          )
        )
      )
      (else
        (i32.store16 (local.get $offset) (local.get $code_point))
      )
    )
  )
)