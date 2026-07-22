
(module
  (import "env" "memory" (memory 1))
  (export "memory" (memory 0))
    
  (global $STATE_NONZERO (mut i32) (i32.const 1))
  (global $STATE_DECIMAL (mut i32) (i32.const 2))
  (global $STATE_END (mut i32) (i32.const 4))
  
  (global $ZERO (mut i32) (i32.const 48))

  (global $exponent (mut i32) (i32.const 0))
  (global $digits_count (mut i32) (i32.const 0))

  (func (export "get_digits") (param $bytes_ptr i32) (param $length i32)
    (local $i i32)
    (local $byte i32)
    (local $digit i32)
    (local $state i32)
    (local $digitsCount i32)
    (local $exponent i32)
    (local $memory_ptr i32)
    
    (local.set $memory_ptr (local.get $bytes_ptr))
    (local.set $state (i32.const 0))
    (local.set $digitsCount (i32.const 0))
    (local.set $exponent (i32.const 0))
    
    (local.set $i (i32.const 0))
    
    (block $outer_break
      (loop $outer_loop
        (br_if $outer_break (i32.ge_u (local.get $i) (local.get $length)))

        ;; while (i < segment_length)
        (block $inner_break
          (loop $inner_loop
            (br_if $inner_break
              (i32.ge_u (local.get $i) (local.get $length)))
            
            ;; byte = bytes[i]
            (local.set $byte
              (i32.load8_u 
                (i32.add (local.get $bytes_ptr) (local.get $i))))
            
            ;; if (isDigitUnsafe(byte)) - checking if byte is digit (48-57)
            (if 
              (i32.and
                (i32.ge_u (local.get $byte) (i32.const 48))
                (i32.le_u (local.get $byte) (i32.const 57)))
              (then
                ;; if (byte !== ZERO || (state & STATE_NONZERO))
                (if 
                  (i32.or
                    (i32.ne (local.get $byte) (global.get $ZERO))
                    (i32.and (local.get $state) (global.get $STATE_NONZERO)))
                  (then
                    ;; digit = byte & 0x0F
                    (local.set $digit 
                      (i32.and (local.get $byte) (i32.const 0x0F)))
                    
                    ;; state |= STATE_NONZERO
                    (local.set $state
                      (i32.or (local.get $state) (global.get $STATE_NONZERO)))
                    
                    ;; if ((state & STATE_DECIMAL) === 0) scale++
                    (if 
                      (i32.eq 
                        (i32.and (local.get $state) (global.get $STATE_DECIMAL))
                        (i32.const 0))
                      (then
                        (local.set $exponent 
                          (i32.add (local.get $exponent) (i32.const 1)))))
                    
                    ;; memory[digitsCount] = digit
                    (i32.store8
                      (i32.add (local.get $memory_ptr) (local.get $digitsCount))
                      (local.get $digit))
                    
                    (local.set $digitsCount 
                      (i32.add (local.get $digitsCount) (i32.const 1)))
                  )
                  (else
                    ;; if (state & STATE_DECIMAL) scale--
                    (if 
                      (i32.and (local.get $state) (global.get $STATE_DECIMAL))
                      (then
                        (local.set $exponent 
                          (i32.sub (local.get $exponent) (i32.const 1)))))))
                
                (local.set $i (i32.add (local.get $i) (i32.const 1)))
                (br $inner_loop))
              (else
                ;; state |= STATE_END
                (local.set $state
                  (i32.or (local.get $state) (global.get $STATE_END)))
                (br $inner_break))))
        
        ;; if (state & STATE_END) break
        (if 
          (i32.and (local.get $state) (global.get $STATE_END))
          (then
            (br $outer_break)))
        
        (br $outer_loop)))
  )
)
)