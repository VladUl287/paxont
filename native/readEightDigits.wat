(module
  (memory (export "memory") 1 16)
  (func (export "readInt32") (param $ptr i32) (param $len i32) (result i32)
    (local $val i64)
  
    (if (i32.lt_u (local.get $len) (i32.add (local.get $ptr) (i32.const 8)))
        (then 
          (return (i32.const -1))
        )
    )

    (i64.load offset=0 align=1 (local.get $ptr))
    i64.const 0x3030303030303030
    i64.sub
    local.set $val
    
    (i64.mul (local.get $val) (i64.const 10))
    (i64.shr_u (local.get $val) (i64.const 8)) 
    i64.add
    local.set $val

    (i64.mul (i64.and (local.get $val) (i64.const 0x000000FF000000FF)) (i64.const 0x000F424000000064))
    (i64.mul (i64.and (i64.shr_u (local.get $val) (i64.const 16)) (i64.const 0x000000FF000000FF)) (i64.const 0x0000271000000001))
    i64.add

    i64.const 32
    i64.shr_u

    i32.wrap_i64
  )
)