(module
  (global $low (mut i32) (i32.const 0))
  (global $mlow (mut i32) (i32.const 0))
  (global $mhigh (mut i32) (i32.const 0))

  (func (export "get_low") (result i32)
    (global.get $low)
  )
  (func (export "get_mlow") (result i32)
    (global.get $mlow)
  )
  (func (export "get_mhigh") (result i32)
    (global.get $mhigh)
  )

  (func $mul (param i32 i32 i32 i32) (result i32)
    (local $mull i64)
    (local $t i64)
    (local $tl i64)
    (local $high64 i64)

    ;; mull = (a_lo * b_lo) as u64
    (local.set $mull
      (i64.mul
        (i64.extend_i32_u (local.get 0))   ;; a_lo
        (i64.extend_i32_u (local.get 2))   ;; b_lo
      )
    )

    ;; t = ((mull >> 32) + (a_hi * b_lo)) as u64
    (local.set $t
      (i64.add
        (i64.shr_u (local.get $mull) (i64.const 32))
        (i64.mul
          (i64.extend_i32_u (local.get 1))   ;; a_hi
          (i64.extend_i32_u (local.get 2))   ;; b_lo
        )
      )
    )

    ;; tl = ((a_lo * b_hi) + (t & 0xFFFFFFFF)) as u64
    (local.set $tl
      (i64.add
        (i64.mul
          (i64.extend_i32_u (local.get 0))   ;; a_lo
          (i64.extend_i32_u (local.get 3))   ;; b_hi
        )
        (i64.extend_i32_u (i32.wrap_i64 (local.get $t)))
      )
    )

    ;; global $low = (mull & 0xFFFFFFFF) as i32
    (global.set $low (i32.wrap_i64 (local.get $mull)))

    ;; global $mlow = (tl & 0xFFFFFFFF) as i32
    (global.set $mlow (i32.wrap_i64 (local.get $tl)))

    (drop (i32.wrap_i64 (local.get $t)))

    ;; high64 = ((a_hi * b_hi) + (t >> 32) + (tl >> 32)) as u64
    (local.set $high64
      (i64.add
        (i64.add
          (i64.mul
            (i64.extend_i32_u (local.get 1))   ;; a_hi
            (i64.extend_i32_u (local.get 3))   ;; b_hi
          )
          (i64.shr_u (local.get $t) (i64.const 32))
        )
        (i64.shr_u (local.get $tl) (i64.const 32))
      )
    )

    ;; global $mhigh = (high64 & 0xFFFFFFFF) as i32
    (global.set $mhigh (i32.wrap_i64 (local.get $high64)))

    ;; Return high64 >> 32 as i32
    (i32.wrap_i64 (i64.shr_u (local.get $high64) (i64.const 32)))
  )
)