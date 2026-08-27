(module
  (import "env" "memory" (memory 1 128))

  (func $find_quote (param $i i32) (param $start i32) (param $end i32) (result i32)
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