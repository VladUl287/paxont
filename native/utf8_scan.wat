(module
  (import "env" "memory" (memory 1 128))

  (global $dq_index (mut i32) (i32.const -1))
  (global $code_units_count (mut i32) (i32.const 0))

  (func (export "code_units_count") (result i32)
    (global.get $code_units_count))
  
  (func (export "dq_index") (result i32)
    (global.get $dq_index))

  (func (export "utf8_scan_ascii") (param $i i32) (param $len i32) (result i32)
    (local $temp_mask i32)
    (local $escaped_mask i32)
    (local $count i32)
    (local $cmp v128)
    (local $quote_vec v128)
    (local $temp i32)
    (local $dq_index i32)
    (local $backslash_vec v128)

    (local.set $backslash_vec (i8x16.splat (i32.const 92)))
    (local.set $quote_vec (i8x16.splat (i32.const 34)))

    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block (i32.gt_u (i32.add (local.get $i) (i32.const 16)) (local.get $len)))

        (local.set $cmp (v128.load (local.get $i)))

        ;; escape
        (local.set $temp_mask (i8x16.bitmask (i8x16.eq (local.get $cmp) (local.get $backslash_vec))))
        (local.set $escaped_mask (i32.and (local.get $temp_mask) (i32.shl (local.get $temp_mask) (i32.const 1))))
        (local.set $temp_mask (i32.and (local.get $temp_mask) (i32.xor (local.get $escaped_mask) (i32.const -1))))
        (local.set $count (i32.popcnt (local.get $temp_mask)))

        (br_if $scan_block (i8x16.bitmask (i8x16.eq (local.get $cmp) (local.get $quote_vec))))

        (local.set $i (i32.add (local.get $i) (i32.const 16)))
        (br $scan_loop)
      ))

    (block $scan_block
      (loop $scan_loop
        (br_if $scan_block (i32.gt_u (i32.add (local.get $i) (i32.const 1)) (local.get $len)))

        (local.set $temp (i32.load8_u (local.get $i)))

        (if (i32.eq (local.get $temp) (i32.const 34))
          (then
            (if (i32.ge_s (local.tee $dq_index (call $find_quote (local.get $i) (local.get $i))) (i32.const 0)) 
              (then
                (global.set $dq_index (local.get $dq_index))
                (return (local.get $count)))
            )))

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $scan_loop)
      ))
    
    (return (i32.const -1))
  )

  (func (export "utf8_scan_ascii_only") (param $a1 i32) (param $a2 i32) (param $a3 i32) (param $a4 i32) (result i32)
    (local $mask i32)
    (local $escaped_mask i32)
    (local $count i32)
    (local $low_i64 i64)
    (local $high_i64 i64)
    (local $vec v128)
    (local $quote_vec v128)
    (local $backslash_vec v128)

    (global.set $dq_index (i32.const -1))

    (local.set $quote_vec (i8x16.splat (i32.const 34)))
    (local.set $backslash_vec (i8x16.splat (i32.const 92)))

    (local.set $low_i64 
      (i64.or 
        (i64.shl (i64.extend_i32_u (local.get $a2)) (i64.const 32))
        (i64.extend_i32_u (local.get $a1))
      ))

    (local.set $high_i64 
      (i64.or 
        (i64.shl (i64.extend_i32_u (local.get $a4)) (i64.const 32))
        (i64.extend_i32_u (local.get $a3))
      ))

    (local.set $vec (i64x2.replace_lane 1 (i64x2.splat (local.get $low_i64)) (local.get $high_i64)))

    ;; escapes
    (local.set $mask (i8x16.bitmask (i8x16.eq (local.get $vec) (local.get $backslash_vec))))
    (local.set $escaped_mask (i32.and (local.get $mask) (i32.shl (local.get $mask) (i32.const 1))))
    (local.set $mask (i32.and (local.get $mask) (i32.xor (local.get $escaped_mask) (i32.const -1))))
    (local.set $count (i32.popcnt (local.get $mask)))

    ;; dq
    (local.set $mask (i8x16.bitmask (i8x16.eq (local.get $vec) (local.get $quote_vec))))
    (if (local.get $mask)
      (then (global.set $dq_index (i32.ctz (local.get $mask))))
    )

    (return (local.get $count))
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