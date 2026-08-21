(module
  (import "env" "memory" (memory 1 128))

  (global $code_units_count (mut i32) (i32.const 0))

  (func (export "code_units_count") (result i32)
    (global.get $code_units_count))

  (func (export "utf8_scan") (param $i i32) (param $end i32) (result i32)
    (local $mask v128)
    (local $mask1 v128)
    (local $mask2 v128)
    (local $cmp v128)
    (local $quote_vec v128)
    (local $chars_count i32)
    (local $temp i32)
    (local $dq_index i32)

    (local.set $quote_vec (i8x16.splat (i32.const 34)))
    (local.set $mask (i8x16.splat (i32.const 128)))
    (local.set $mask1 (i8x16.splat (i32.const 192)))
    (local.set $mask2 (i8x16.splat (i32.const 240)))

    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block (i32.gt_u (i32.add (local.get $i) (i32.const 16)) (local.get $end)))

        (local.set $cmp (v128.load (local.get $i)))

        (br_if $scan_block (i8x16.bitmask (i8x16.eq (local.get $cmp) (local.get $quote_vec))))

        (local.set $chars_count 
          (i32.add 
            (local.get $chars_count) 
            (i32.popcnt (i8x16.bitmask (i8x16.ge_u (local.get $cmp) (local.get $mask2))))
          )
        )

        (local.set $cmp (v128.and (local.get $cmp) (local.get $mask1)))
        (local.set $cmp (i8x16.eq (local.get $cmp) (local.get $mask)))

        (local.set $chars_count 
          (i32.add 
            (local.get $chars_count) 
            (i32.sub (i32.const 16) (i32.popcnt (i8x16.bitmask (local.get $cmp))))
          )
        )
        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $scan_loop)
      ))

    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block (i32.gt_u (i32.add (local.get $i) (i32.const 1)) (local.get $end)))

        (local.set $temp (i32.load8_u (local.get $i)))

        (if (i32.eq (local.get $temp) (i32.const 34))
          (then
            (if (i32.ge_s (local.tee $dq_index (call $find_quote (local.get $i) (local.get $i))) (i32.const 0)) 
              (then
                (global.set $code_units_count (local.get $chars_count))
                (return (local.get $dq_index)))
            )
          )
        )

        (if (i32.ne (i32.and (local.get $temp) (i32.const 192)) (i32.const 128))
          (then
            (local.set $chars_count 
              (i32.add 
                (local.get $chars_count) 
                (i32.add (i32.const 1) (i32.ge_u (local.get $temp) (i32.const 240)))
              )
            )
          )
        )
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan_loop)
      ))
    
    (return (i32.const -1))
  )

  (func (export "utf8_scan_exact") (param $i i32) (param $end i32) (result i32)
    (local $mask v128)
    (local $mask1 v128)
    (local $mask2 v128)
    (local $cmp v128)
    (local $chars_count i32)
    (local $temp i32)

    (local.set $mask (i8x16.splat (i32.const 128)))
    (local.set $mask1 (i8x16.splat (i32.const 192)))
    (local.set $mask2 (i8x16.splat (i32.const 240)))
    
    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block (i32.gt_u (i32.add (local.get $i) (i32.const 16)) (local.get $end)))

        (local.set $cmp (v128.load (local.get $i)))
        (local.set $chars_count 
          (i32.add 
            (local.get $chars_count) 
            (i32.popcnt (i8x16.bitmask (i8x16.ge_u (local.get $cmp) (local.get $mask2))))
          )
        )

        (local.set $cmp (v128.and (local.get $cmp) (local.get $mask1)))
        (local.set $cmp (i8x16.eq (local.get $cmp) (local.get $mask)))

        (local.set $chars_count 
          (i32.add 
            (local.get $chars_count) 
            (i32.sub (i32.const 16) (i32.popcnt (i8x16.bitmask (local.get $cmp))))
          )
        )

        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $scan_loop)
      ))

    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block (i32.gt_u (i32.add (local.get $i) (i32.const 1)) (local.get $end)))

        (local.set $temp (i32.load8_u (local.get $i)))
        (if (i32.lt_u (i32.and (local.get $temp) (i32.const 192)) (i32.const 128))
          (then
            (local.set $chars_count 
              (i32.add 
                (local.get $chars_count) 
                (i32.add (i32.const 1) (i32.ge_u (local.get $temp) (i32.const 240)))
              )
            )
          )
        )
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan_loop)
      ))
    
    (global.set $code_units_count (local.get $chars_count))
    (return (local.get $i))
  )

  (func $find_quote (param $i i32) (param $len i32) (result i32)
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

        ;; quote -> check if escaped
        (if (i32.eq (local.get $byte) (i32.const 34))
          (then
            (local.set $j (local.get $i))
            (local.set $is_escaped (i32.const 0))

            ;; count consecutive backslashes before the quote
            (block $backslash_loop
              (loop $backslash
                ;; j -= 1
                (local.set $j (i32.sub (local.get $j) (i32.const 1)))

                ;; if j < start
                (br_if $backslash_loop
                  (i32.lt_s (local.get $j) (local.get $start))
                )

                ;; stop if current byte is not a backslash
                (br_if $backslash_loop
                  (i32.ne (i32.load8_u (local.get $j)) (i32.const 92))
                )

                ;; is_escaped != is_escaped
                (local.set $is_escaped (i32.eqz (local.get $is_escaped)))
                (br $backslash)
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
      ))

    (return (i32.const -1))
  )
)