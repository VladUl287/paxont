(module
  (memory (export "u8") 1 128)

  (func (export "utf8_to_utf16") (param $ptr i32) (param $len i32) (param $target i32) (result i32)
    (local $i i32)
    (local $num2 i32)

    local.get $ptr
    local.set $i

    (block $done
      (loop $main
        local.get $i
        i32.const 4
        i32.add
        local.get $len
        i32.le_u
        i32.eqz
        br_if $done

        (i32.load align=1 (local.get $i))
        local.set $num2

        (if (i32.eq (i32.and (local.get $num2) (i32.const 0xC0E0C0E0)) (i32.const 0x80C080C0))
            (then 
                (i32.store align=1 
                  (local.get $target) 
                  (i32.or
                    (i32.shr_u
                      (i32.and
                        (local.get $num2)
                        (i32.const 0x3F003F00)
                      )
                      (i32.const 8)
                    )
                    (i32.shl
                      (i32.and
                        (local.get $num2)
                        (i32.const 0x1F001F)
                      )
                      (i32.const 6)
                    )
                  )
                )
            )
            (else 
                (br $done)
            )
        )

        local.get $i
        i32.const 4
        i32.add
        local.set $i
        br $main
      )
    )

    local.get $i
  )
)