(module
  (import "env" "memory" (memory 1 128))
  (export "memory" (memory 0))

  (global $dq_index (mut i32) (i32.const 0))

  (func (export "dq_index") (result i32)
    (global.get $dq_index))

  (func (export "try_find_end_of_string") (param $i i32) (param $len i32) (result i32)
    (local $target v128)
    (local $vec v128)
    (local $temp i32)

    (local.set $target (i8x16.splat (i32.const 34)))

    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block 
          (i32.lt_u (i32.add (local.get $i) (i32.const 16)) (local.get $len)))

        (local.set $vec (v128.load (local.get $i)))

        (if (i8x16.bitmask (i8x16.eq (local.get $vec) (local.get $target)))
          (then 
            (if (i32.ge_u
              (local.tee $temp (call $find_unescaped_quote (local.get $i) (i32.add (local.get $i) (i32.const 16))))
              (i32.const 0))
              (then 
                (global.set $dq_index (local.get $temp))
                (return (local.get $temp))
            ))
        ))

        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $scan_loop)
      )
    )

    (if (i32.ge_u
      (local.tee $temp (call $find_unescaped_quote (local.get $i) (local.get $len)))
      (i32.const 0))
      (then 
        (global.set $dq_index (local.get $temp))
        (return (local.get $temp))
    ))

    (return (local.get $len))
  )

  (func $find_unescaped_quote (param $i i32) (param $len i32) (result i32)
    (local $start i32)
    (local $byte i32)
    (local $j i32)
    (local $is_escaped i32)
    
    (local.set $start (local.get $i))

    (block $scan_done
      (loop $scan_loop
        (br_if $scan_done
          (i32.gt_u (local.get $i) (local.get $len)))

        (local.set $byte (i32.load8_u (local.get $i)))

        (if (i32.eq (local.get $byte) (i32.const 34))
          (then
            (local.set $j (local.get $i))
            (local.set $is_escaped (i32.const 0))

            (block $backslash_loop
              (loop $backslash
                (local.set $j (i32.sub (local.get $j) (i32.const 1)))

                (br_if $backslash_loop
                  (i32.lt_s (local.get $j) (local.get $start))
                )

                (br_if $backslash_loop
                  (i32.ne (i32.load8_u (local.get $j)) (i32.const 92))
                )

                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                (br $backslash)
              )
            )

            (if (i32.eqz (local.get $is_escaped))
              (then 
                (global.set $dq_index (local.get $i))
                (return (local.get $i)))
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