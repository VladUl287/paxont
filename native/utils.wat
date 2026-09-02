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
  
  (func $is_backslash (param $ptr i32) (result i32)
    (i32.eq (i32.load8_u (local.get $ptr)) (i32.const 0x5C))  ;; '\'
  )

  (func $escape_sequence_length (param $start i32) (param $end i32) (result i32)
    (local $pos i32)
    (local $byte i32)
    (local $remaining i32)
    
    (if (i32.lt_u (i32.sub (local.get $end) (local.get $start)) (i32.const 2))
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
        (if (i32.lt_u (i32.sub (local.get $end) (local.get $start)) (i32.const 6))
          (then (return (i32.const 0)))
        )
        
        (local.set $pos (i32.add (local.get $pos) (i32.const 1)))
        (local.set $remaining (i32.const 4))
        
        (block $hex_check
          (loop $hex_loop
            (local.set $byte (i32.load8_u (local.get $pos)))
            
            ;; is hex digit (0-9, A-F, a-f)
            (if 
              (i32.or
                (i32.or 
                  (i32.and 
                    (i32.ge_u (local.get $byte) (i32.const 0x30))
                    (i32.le_u (local.get $byte) (i32.const 0x39))
                  )  ;; 0-9
                  (i32.and 
                    (i32.ge_u (local.get $byte) (i32.const 0x41))
                    (i32.le_u (local.get $byte) (i32.const 0x46))
                  )
                )  ;; A-F
                (i32.and 
                  (i32.ge_u (local.get $byte) (i32.const 0x61)) 
                  (i32.le_u (local.get $byte) (i32.const 0x66))
                )   ;; a-f
              )
              (then
                (local.set $pos (i32.add (local.get $pos) (i32.const 1)))
                (local.set $remaining (i32.sub (local.get $remaining) (i32.const 1)))
                
                (if (i32.gt_u (local.get $remaining) (i32.const 0))
                  (then (br $hex_loop))
                  (else (br $hex_check))
                )
              )
              (else (return (i32.const 0)))
            )
          )
        )
        
        (return (i32.const 6))
      )
    )
    (return (i32.const 0))
  )

  (func $find_backslash (param $pos i32) (param $start i32) (result i32)
    (local $byte i32)

    (if (i32.gt_s (i32.sub (local.get $pos) (i32.const 6)) (local.get $start))
      (then (local.set $start (i32.sub (local.get $pos) (i32.const 6))))
    )

    (block $done
      (loop $loop
        (br_if $done (i32.lt_s (local.get $pos) (local.get $start)))

        (local.set $byte (i32.load8_u (local.get $pos)))
        
        (if (i32.eq (local.get $byte) (i32.const 92))  ;; '\'
          (then (return (i32.const 1)))
        )
        
        (local.set $pos (i32.sub (local.get $pos) (i32.const 1)))
        (br $loop)
      )
    )
    (return (i32.const 0))
  )

  (func (export "trim_to_last_char") (param $start i32) (param $end i32) (result i32)
    (local $pos i32)
    (local $seq_len i32)
    (local $byte i32)
    (local $esc_len i32)
    
    (if (i32.ge_u (local.get $start) (local.get $end))
      (then (return (local.get $end)))
    )

    (local.set $pos (local.get $end))

    (block $done
      (loop $loop
        (if (i32.lt_s (local.get $pos) (local.get $start))
          (then (return (i32.const -1)))
        )
        
        (local.set $byte (i32.load8_u (local.get $pos)))
        
        (if (i32.eq (local.get $byte) (i32.const 92))  ;; '\'
          (then
            (local.set $esc_len (call $escape_sequence_length (local.get $pos) (local.get $end)))
            
            (if (i32.gt_s (local.get $esc_len) (i32.const 0))
              (then
                (if (i32.le_s (i32.add (local.get $pos) (local.get $esc_len)) (local.get $end))
                  (then
                    (return (i32.add (local.get $pos) (local.get $esc_len)))
                  )
                  (else 
                    (local.set $pos (i32.sub (local.get $pos) (i32.const 1)))
                    (br $loop)
                  )
                )
              )
              (else
                (local.set $pos (i32.sub (local.get $pos) (i32.const 1)))
                (br $loop)
              )
            )
          )
          (else
            (if (i32.eq (i32.and (local.get $byte) (i32.const 0xC0)) (i32.const 0x80)) ;; is continuation byte
              (then
                (local.set $pos (i32.sub (local.get $pos) (i32.const 1)))
                (br $loop)
              )
              (else
                (if (call $find_backslash (local.get $pos) (local.get $start))
                  (then
                    (local.set $pos (i32.sub (local.get $pos) (i32.const 1)))
                    (br $loop)
                  )
                )

                (local.set $seq_len (call $utf8_sequence_length (local.get $pos)))
                
                (if (i32.le_s (i32.add (local.get $pos) (local.get $seq_len)) (local.get $end))
                  (then
                    (return (i32.add (local.get $pos) (local.get $seq_len)))
                  )
                  (else
                    (local.set $pos (i32.sub (local.get $pos) (i32.const 1)))
                    (br $loop)
                  )
                )
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
)