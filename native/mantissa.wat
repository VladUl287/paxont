(module
  (import "env" "memory" (memory 1))
  (export "memory" (memory 0))
      
  (global $exponent (mut i32) (i32.const 0))
  (global $digits_count (mut i32) (i32.const 0))

  (func (export "get_digits") (param $srcPtr i32) (param $length i32)
    (local $targetPtr i32)
    (local $i i32)
    (local $byte i32)
    (local $digit i32)
    (local $digitsCount i32)
    (local $exponent i32)
    (local $data v128)
    (local $sub v128)
    (local $cmp v128)
    (local $STATE_NONZERO i32)
    (local $STATE_DECIMAL i32)
    
    (local.set $STATE_NONZERO (i32.const 0))
    (local.set $STATE_DECIMAL (i32.const 0))

    (local.set $targetPtr (local.get $srcPtr))
    (local.set $digitsCount (i32.const 0))
    (local.set $exponent (i32.const 0))
    (local.set $i (i32.const 0))
    
    (block $outer_break
      (loop $outer_loop
        (if (i32.le_u (local.get $i) (i32.sub (local.get $length) (i32.const 16)))
          (then
            (local.set $data (v128.load (local.get $i)))
            (local.set $sub (i8x16.sub (local.get $data) (v128.const i8x16 48 48 48 48 48 48 48 48 48 48 48 48 48 48 48 48)))
            (local.set $cmp (i8x16.le_u (local.get $sub) (v128.const i8x16 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9 9)))

            (br_if $outer_break (i32.eqz (i8x16.all_true (local.get $cmp))))

            (v128.store (local.get $targetPtr) (local.get $sub))
            
            (local.set $i (i32.add (local.get $i) (i32.const 16)))
            (local.set $targetPtr (i32.add (local.get $targetPtr) (i32.const 16)))
            (local.set $digitsCount (i32.add (local.get $digitsCount) (i32.const 16)))

            (br $outer_loop)
          )
          (else (br $outer_break))
      )))

    (block $inner_break
      (loop $inner_loop
        (br_if $inner_break (i32.ge_u (local.get $i) (local.get $length)))
        
        (local.set $byte
          (i32.load8_u 
            (i32.add (local.get $srcPtr) (local.get $i))))
        
        (if 
          (i32.le_u
            (i32.sub (local.get $byte) (i32.const 48))
            (i32.const 9))
          (then
            ;; if (byte !== ZERO || (state & STATE_NONZERO))
            (if 
              (i32.or
                (i32.ne (local.get $byte) (i32.const 48))
                (local.get $STATE_NONZERO))
              (then
                ;; digit = byte & 0x0F
                (local.set $digit 
                  (i32.and (local.get $byte) (i32.const 0x0F)))
                
                ;; state |= STATE_NONZERO
                (local.set $STATE_NONZERO (i32.const 1))
                
                ;; if ((state & STATE_DECIMAL) === 0) exponent++
                (if (i32.eqz (local.get $STATE_DECIMAL))
                  (then
                    (local.set $exponent (i32.add (local.get $exponent) (i32.const 1)))))
                
                ;; memory[j] = digit
                (i32.store8 (local.get $targetPtr) (local.get $digit))
                
                (local.set $targetPtr 
                  (local.tee $digitsCount (i32.add (local.get $digitsCount) (i32.const 1))))
              )
              (else
                ;; if (state & STATE_DECIMAL) scale--
                (if (local.get $STATE_DECIMAL)
                  (then
                    (local.set $exponent (i32.sub (local.get $exponent) (i32.const 1)))))))
            
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $inner_loop))
          (else br $inner_break)
        ))
    )
  )
)