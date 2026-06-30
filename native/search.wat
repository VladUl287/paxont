(module
  (memory (export "memory") 1 128)
  (func (export "findNext") (param $ptr i32) (param $len i32) (param $byte i32) (result i32)
    (local $i i32)
    (local $target v128)
    (local $vec v128)
    (local $mask i32)

    local.get $ptr
    local.set $i

    ;; Replicate the byte into all 16 lanes of a 128-bit register
    local.get $byte
    i8x16.splat
    local.set $target

    ;; Loop over full 16-byte blocks
    (block $done
      (loop $main
        ;; While i + 16 <= len
        local.get $i
        i32.const 16
        i32.add
        local.get $len
        i32.le_u
        i32.eqz
        br_if $done       ;; exit loop when remaining < 16

        ;; Load 16 bytes
        local.get $i
        v128.load
        local.set $vec

        ;; Compare equal to target (bytewise)
        local.get $vec
        local.get $target
        i8x16.eq

        ;; Get bitmask: bit j set if byte j matched
        i8x16.bitmask
        local.tee $mask

        ;; If any bit is set, we found it
        if
          ;; Compute exact index: current offset + trailing zeros of mask
          local.get $i
          local.get $mask
          i32.ctz
          i32.add
          return
        end

        ;; Advance by 16
        local.get $i
        i32.const 16
        i32.add
        local.set $i
        br $main
      )
    )

    ;; Scalar tail – check bytes i..len-1 one by one
    (loop $tail
      local.get $i
      local.get $len
      i32.ge_u
      if
        ;; Reached end, not found
        i32.const -1
        return
      end

      ;; Load one byte (use i32.load8_u)
      local.get $i
      i32.load8_u
      local.get $byte
      i32.eq
      if
        local.get $i
        return
      end

      local.get $i
      i32.const 1
      i32.add
      local.set $i
      br $tail
    )
    i32.const -1   ;; unreachable
  )
)