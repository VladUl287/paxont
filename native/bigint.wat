(module
  (memory (export "memory") 1)
  
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
  
  (func (export "reset")
    (i32.store (i32.const 0) (i32.const 0))
    (i32.store (i32.const 4) (i32.const 0))
  )
)