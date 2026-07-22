(module
  (import "env" "memory" (memory 1))
  (export "memory" (memory 0))
  
  (func (export "fromDigits") (param $digits_ptr i32) (param $digits_len i32) (result i32)
    (local $chunkCount i32)
    (local $chunkIdx i32)
    (local $i i32)
    (local $j i32)
    (local $carry i64)
    (local $product i64)
    (local $limbCount i32)
    (local $temp i32)
    (local $chunkValue i64)
    (local $result_ptr i32)

    (local.set $result_ptr (i32.const 0))
    (i32.store (local.get $result_ptr) (i32.const 0))

    (local.set $chunkCount 
      (i32.div_u 
        (i32.add (local.get $digits_len) (i32.const 8))
        (i32.const 9)
      )
    )

    (local.set $chunkIdx (i32.const 0))
    (local.set $i (i32.const 0))

    (block $process_chunks
      (loop $chunk_loop
        (br_if $process_chunks 
          (i32.ge_u (local.get $chunkIdx) (local.get $chunkCount))
        )

        (local.set $chunkValue (i64.const 0))
        (local.set $i (i32.const 0))

        (block $build_chunk
          (loop $digit_loop
            (br_if $build_chunk
              (i32.or
                (i32.ge_u (local.get $i) (i32.const 9))
                (i32.ge_u (local.get $chunkIdx) (local.get $chunkCount))
              )
            )

            (local.set $temp
              (i32.sub
                (i32.add (local.get $digits_len) (i32.const -1))
                (i32.add
                  (i32.mul (local.get $chunkIdx) (i32.const 9))
                  (local.get $i)
                )
              )
            )

            (if (i32.ge_u (local.get $temp) (i32.const 0))
              (then
                (local.set $chunkValue
                  (i64.add
                    (i64.mul (local.get $chunkValue) (i64.const 10))
                    (i64.extend_i32_u
                      (i32.load8_u
                        (i32.add (local.get $digits_ptr) (local.get $temp))
                      )
                    )
                  )
                )
              )
            )

            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $digit_loop)
          )
        )

        (local.set $carry (local.get $chunkValue))
        (local.set $j (i32.const 0))
        (local.set $limbCount (i32.load (local.get $result_ptr)))

        (block $multiply_limbs
          (loop $limb_loop
            (br_if $multiply_limbs
              (i32.ge_u (local.get $j) (local.get $limbCount))
            )

            (local.set $product
              (i64.add
                (i64.mul
                  (i64.extend_i32_u
                    (i32.load
                      (i32.add
                        (i32.add (local.get $result_ptr) (i32.const 4))
                        (i32.mul (local.get $j) (i32.const 4))
                      )
                    )
                  )
                  (i64.const 1000000000)
                )
                (local.get $carry)
              )
            )

            (i32.store
              (i32.add
                (i32.add (local.get $result_ptr) (i32.const 4))
                (i32.mul (local.get $j) (i32.const 4))
              )
              (i32.wrap_i64 (local.get $product))
            )

            (local.set $carry (i64.shr_u (local.get $product) (i64.const 32)))

            (local.set $j (i32.add (local.get $j) (i32.const 1)))
            (br $limb_loop)
          )
        )

        (block $add_carry
          (loop $carry_loop
            (br_if $add_carry (i64.eqz (local.get $carry)))

            (i32.store
              (i32.add
                (i32.add (local.get $result_ptr) (i32.const 4))
                (i32.mul (local.get $limbCount) (i32.const 4))
              )
              (i32.wrap_i64 (local.get $carry))
            )

            (local.set $limbCount (i32.add (local.get $limbCount) (i32.const 1)))
            (local.set $carry (i64.shr_u (local.get $carry) (i64.const 32)))
            (br $carry_loop)
          )
        )

        (i32.store (local.get $result_ptr) (local.get $limbCount))

        (local.set $chunkIdx (i32.add (local.get $chunkIdx) (i32.const 1)))
        (br $chunk_loop)
      )
    )

    (i32.load (local.get $result_ptr))
  )

  (func (export "init") (param $value i32)
    (i32.store (i32.const 0) (i32.const 1))
    (i32.store (i32.const 4) (local.get $value))
  )
  
  (func (export "add") (param $value i32) (result i32)
    (local $ptr i32)
    (local $length i32)
    (local $i i32)
    (local $carry i64)
    (local $sum i64)
    (local $new_length i32)
    
    (local.set $ptr (i32.const 0))
    
    (local.set $length (i32.load (local.get $ptr)))
    
    (local.set $carry (i64.extend_i32_u (local.get $value)))
    (local.set $i (i32.const 0))
    
    (loop $add_loop
      (block $add_done
        (br_if $add_done 
          (i32.or
            (i32.ge_u (local.get $i) (local.get $length))
            (i64.eqz (local.get $carry))
          )
        )
        
        (local.set $sum
          (i64.add
            (i64.extend_i32_u
              (i32.load 
                (i32.add 
                  (i32.add (local.get $ptr) (i32.const 4))
                  (i32.mul (local.get $i) (i32.const 4))
                )
              )
            )
            (local.get $carry)
          )
        )
        
        (i32.store 
          (i32.add 
            (i32.add (local.get $ptr) (i32.const 4))
            (i32.mul (local.get $i) (i32.const 4))
          )
          (i32.wrap_i64 (local.get $sum))
        )
        
        (local.set $carry (i64.shr_u (local.get $sum) (i64.const 32)))
        
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $add_loop)
      )
    )
    
    (if (i64.ne (local.get $carry) (i64.const 0))
      (then
        (local.set $new_length (i32.add (local.get $length) (i32.const 1)))
        (i32.store (local.get $ptr) (local.get $new_length))
        (i32.store 
          (i32.add 
            (i32.add (local.get $ptr) (i32.const 4))
            (i32.mul (local.get $length) (i32.const 4))
          )
          (i32.wrap_i64 (local.get $carry))
        )
        (return (local.get $new_length))
      )
    )
    
    (local.get $length)
  )

  (func (export "mul") (param $multiplier i32) (result i32)
    (local $ptr i32)
    (local $length i32)
    (local $i i32)
    (local $carry i64)
    (local $result i64)
    (local $new_length i32)
    
    (local.set $ptr (i32.const 0))
    (local.set $length (i32.load (local.get $ptr)))
    
    (local.set $carry (i64.const 0))
    (local.set $i (i32.const 0))
    
    (loop $multiply_loop
      (block $multiply_done
        (br_if $multiply_done 
          (i32.ge_u (local.get $i) (local.get $length))
        )
        
        (local.set $result
          (i64.add
            (i64.mul
              (i64.extend_i32_u
                (i32.load 
                  (i32.add 
                    (i32.add (local.get $ptr) (i32.const 4))
                    (i32.mul (local.get $i) (i32.const 4))
                  )
                )
              )
              (i64.extend_i32_u (local.get $multiplier))
            )
            (local.get $carry)
          )
        )
        
        (i32.store 
          (i32.add 
            (i32.add (local.get $ptr) (i32.const 4))
            (i32.mul (local.get $i) (i32.const 4))
          )
          (i32.wrap_i64 (local.get $result))
        )
        
        (local.set $carry (i64.shr_u (local.get $result) (i64.const 32)))
        
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $multiply_loop)
      )
    )
    
    (if (i64.ne (local.get $carry) (i64.const 0))
      (then
        (local.set $new_length (i32.add (local.get $length) (i32.const 1)))
        (i32.store (local.get $ptr) (local.get $new_length))
        (i32.store 
          (i32.add 
            (i32.add (local.get $ptr) (i32.const 4))
            (i32.mul (local.get $length) (i32.const 4))
          )
          (i32.wrap_i64 (local.get $carry))
        )
        (return (local.get $new_length))
      )
    )
    
    (local.get $length)
  )
)