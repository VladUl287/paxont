(module
  (import "env" "memory" (memory 1 128))

  (func $utf8_sequence_length (param $ptr i32) (result i32)
    (local $byte i32)
    (local.set $byte (i32.load8_u (local.get $ptr)))
    
    ;; ASCII (0xxxxxxx) - 1 byte
    (if (i32.eqz (i32.and (local.get $byte) (i32.const 0x80)))
      (then (return (i32.const 1)))
    )
    
    ;; 2-byte sequence (110xxxxx)
    (if (i32.eq (i32.and (local.get $byte) (i32.const 0xE0)) (i32.const 0xC0))
      (then (return (i32.const 2)))
    )
    
    ;; 3-byte sequence (1110xxxx)
    (if (i32.eq (i32.and (local.get $byte) (i32.const 0xF0)) (i32.const 0xE0))
      (then (return (i32.const 3)))
    )
    
    ;; 4-byte sequence (11110xxx)
    (if (i32.eq (i32.and (local.get $byte) (i32.const 0xF8)) (i32.const 0xF0))
      (then (return (i32.const 4)))
    )
    
    ;; invalid or continuation byte
    (return (i32.const 1))
  )
  
  (func $escape_sequence_length (param $start i32) (param $len i32) (result i32)
    (local $pos i32)
    (local $byte i32)
    (local $hex_value i32)
    
    (if (i32.le_u (i32.sub (local.get $len) (local.get $start)) (i32.const 2))
      (then (return (i32.const 0)))
    )
    
    (local.set $pos (local.get $start))
    (if (i32.ne (i32.load8_u (local.get $pos)) (i32.const 92))
      (then (return (i32.const 0)))
    )
    
    (local.set $pos (i32.add (local.get $pos) (i32.const 1)))
    (local.set $byte (i32.load8_u (local.get $pos)))
    
    (if (i32.eq (local.get $byte) (i32.const 0x22)) (then (return (i32.const 2))))  ;; "
    (if (i32.eq (local.get $byte) (i32.const 0x5C)) (then (return (i32.const 2))))  ;; \
    (if (i32.eq (local.get $byte) (i32.const 0x2F)) (then (return (i32.const 2))))  ;; /
    (if (i32.eq (local.get $byte) (i32.const 0x62)) (then (return (i32.const 2))))  ;; b
    (if (i32.eq (local.get $byte) (i32.const 0x66)) (then (return (i32.const 2))))  ;; f
    (if (i32.eq (local.get $byte) (i32.const 0x6E)) (then (return (i32.const 2))))  ;; n
    (if (i32.eq (local.get $byte) (i32.const 0x72)) (then (return (i32.const 2))))  ;; r
    (if (i32.eq (local.get $byte) (i32.const 0x74)) (then (return (i32.const 2))))  ;; t

    (if (i32.eq (local.get $byte) (i32.const 0x75))  ;; \uXXXX
      (then
        (if (i32.le_u (i32.sub (local.get $len) (local.get $start)) (i32.const 6))
          (then (return (i32.const 0)))
        )
        
        (call $parse_unicode_escape (local.get $pos) (local.get $len))
        (local.set $hex_value)
        (local.set $pos)

        (if (i32.eq (local.get $hex_value) (i32.const -1)) 
          (then (return (i32.const 0)))
        )
        
        (if 
          (i32.and
            (i32.ge_u (local.get $hex_value) (i32.const 0xD800))
            (i32.le_u (local.get $hex_value) (i32.const 0xDBFF))
          )
          (then (return (i32.const 0)))
        )

        (return (i32.const 6))
      )
    )
    (return (i32.const 0))
  )

  (func (export "trim_to_last_char") (param $start i32) (param $len i32) (result i32)
    (local $i i32)
    (local $j i32)
    (local $t i32)
    (local $byte i32)
    (local $seq_len i32)
    (local $esc_len i32)
    (local $is_escaped i32)
    (local $temp i32)

    (local.set $i (i32.sub (local.get $len) (i32.const 1)))

    (block $done
      (loop $loop
        (if (i32.lt_s (local.get $i) (local.get $start))
          (then (return (i32.const -1)))
        )
        
        (local.set $byte (i32.load8_u (local.get $i)))
        
        (if (i32.eq (local.get $byte) (i32.const 92))  ;; '\'
          (then
            (local.set $esc_len (call $escape_sequence_length (local.get $i) (local.get $len)))

            (local.set $j (local.get $i))
            (local.set $is_escaped (i32.const 0))

            (block $backslash_block
              (loop $backslash_loop
                (local.set $j (i32.sub (local.get $j) (i32.const 1)))

                (br_if $backslash_block
                  (i32.lt_s (local.get $j) (local.get $start))
                )

                (br_if $backslash_block
                  (i32.ne (i32.load8_u (local.get $j)) (i32.const 92))
                )

                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                (br $backslash_loop)
              )
            )

            (if (local.get $is_escaped) (then (return (i32.add (local.get $i) (i32.const 1)))))
            
            (if (i32.gt_s (local.get $esc_len) (i32.const 0))
              (then (return (i32.add (local.get $i) (local.get $esc_len))))
            )

            (local.set $i (i32.sub (local.get $i) (i32.const 1)))
            (br $loop)
          )
          (else
            (if (i32.eq (i32.and (local.get $byte) (i32.const 0xC0)) (i32.const 0x80)) ;; is continuation byte
              (then
                (local.set $i (i32.sub (local.get $i) (i32.const 1)))
                (br $loop)
              )
              (else
                (local.set $seq_len (call $utf8_sequence_length (local.get $i)))
                
                (if (i32.eq (local.get $seq_len) (i32.const 1))
                  (then
                    (local.set $j (local.get $i))
                    (local.set $temp (i32.sub (local.get $i) (i32.const 6)))
                    (if (i32.lt_s (local.get $temp) (local.get $start)) 
                      (then (local.set $temp (local.get $start)))
                    )

                    (block $back_done
                      (loop $back_loop
                        (if (i32.lt_s (local.get $j) (local.get $temp))
                          (then (return (i32.add (local.get $i) (local.get $seq_len))))
                        )

                        (if (i32.eq (i32.load8_u (local.get $j)) (i32.const 92)) 
                          (then
                            (local.set $is_escaped (i32.const 0))
                            (local.set $t (local.get $j))

                            (block $backslash_block
                              (loop $backslash_loop
                                (local.set $t (i32.sub (local.get $t) (i32.const 1)))

                                (br_if $backslash_block
                                  (i32.lt_s (local.get $t) (local.get $start))
                                )

                                (br_if $backslash_block
                                  (i32.ne (i32.load8_u (local.get $t)) (i32.const 92))
                                )

                                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                                (br $backslash_loop)
                              )
                            )

                            (if (local.get $is_escaped) (then (return (i32.add (local.get $i) (i32.const 1)))))

                            (local.set $esc_len (call $escape_sequence_length (local.get $j) (local.get $i)))

                            (if (i32.gt_s (local.get $esc_len) (i32.const 0))
                              (then (return (i32.add (local.get $j) (local.get $esc_len))))
                            )
                            
                            (local.set $i (i32.sub (local.get $j) (i32.const 1)))
                            (br $loop)
                          )
                        )

                        (local.set $j (i32.sub (local.get $j) (i32.const 1)))
                        (br $back_loop)
                      )
                    )

                    (return (i32.add (local.get $i) (local.get $esc_len)))
                  )
                )

                (if (i32.lt_s (i32.add (local.get $i) (local.get $seq_len)) (local.get $len))
                  (then (return (i32.add (local.get $i) (local.get $seq_len))))
                )

                (local.set $i (i32.sub (local.get $i) (i32.const 1)))
                (br $loop)
              )
            )
          )
        )
      )
    )

    (return (i32.const -1))
  )

  (func (export "find_quote") (param $i i32) (param $start i32) (param $end i32) (result i32)
    (local $value i32)
    (local $j i32)
    (local $is_escaped i32)
    
    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block
          (i32.gt_u (local.get $i) (local.get $end))
        )

        (local.set $value (i32.load8_u (local.get $i)))

        ;; quote
        (if (i32.eq (local.get $value) (i32.const 34))
          (then
            (local.set $j (local.get $i))
            (local.set $is_escaped (i32.const 0))

            ;; count consecutive backslashes before the quote
            (block $backslash_block
              (loop $backslash_loop
                ;; j -= 1
                (local.set $j (i32.sub (local.get $j) (i32.const 1)))

                ;; if j < start
                (br_if $backslash_block
                  (i32.lt_s (local.get $j) (local.get $start))
                )

                ;; stop if current byte is not a backslash
                (br_if $backslash_block
                  (i32.ne (i32.load8_u (local.get $j)) (i32.const 92))
                )

                ;; is_escaped != is_escaped
                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                (br $backslash_loop)
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
    
    (return (i32.const -1))
  )

  (func $hex_to_value (export "hex_to_value") (param $char i32) (result i32)
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

  (func $parse_unicode_escape (export "parse_unicode_escape") (param $pos i32) (param $len i32) (result i32 i32)
    (local $hex_value i32)
    (local $hex_digit i32)
    (local $i i32)

    (local.set $i (local.get $pos))
    (local.set $hex_value (i32.const 0))
    
    (if (i32.ge_u (i32.add (local.get $i) (i32.const 4)) (local.get $len))
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
)