(module
  (import "env" "memory" (memory 1 128))
  (import "utils" "find_quote" (func $find_quote (param $i i32) (param $start i32) (param $end i32) (result i32)))
  (import "ascii" "parse_ascii"
    (func $parse_ascii (param $i i32) (param $start i32) (param $end i32) (param $target i32) (param $extend i32) (result i32 i32)))

  (global $not_extended (mut i32) (i32.const 0))
  (global $dq_index (mut i32) (i32.const -1))
  (global $target (mut i32) (i32.const 0))

  (func (export "not_extended") (result i32)
    (global.get $not_extended))

  (func (export "dq_index") (result i32)
    (global.get $dq_index))

  (func (export "target") (result i32)
    (global.get $target))

  (func (export "utf8_to_utf16") (param $i i32) (param $len i32) (param $target i32) (param $partial i32) (result i32)
    (local $mask i32)
    (local $temp i32)
    (local $target_temp i32)
    (local $start_byte i32)
    (local $temp_v128 v128)
    (local $quote_vec v128)
    (local $byte_mask i32)
    (local $trailing i32)
    (local $partialChar i32)
    (local $start i32)
    
    (local.set $start (local.get $i))

    (local.set $quote_vec (i8x16.splat (i32.const 34)))

    (global.set $not_extended (i32.const 0))
    (global.set $dq_index (i32.const -1))
    (global.set $target (i32.const 0))

    (call $parse_ascii (local.get $i) (local.get $start) (local.get $len) (local.get $target) (i32.const 0))
    (local.set $target_temp)
    (local.set $i)

    (if (i32.eq (local.get $i) (i32.const -1))
      (then (return (i32.const -1)))
    )

    (if (i32.eq (i32.load8_u (local.get $i)) (i32.const 34))
      (then 
        (if (i32.ge_s (local.tee $temp (call $find_quote (local.get $i) (local.get $start) (local.get $i))) (i32.const 0))
          (then
            (global.set $dq_index (local.get $temp))
            (global.set $not_extended (i32.eq (local.get $target) (local.get $target_temp)))
            (global.set $target (local.get $target_temp))
            (return (local.get $temp)))
        )
      )
    )

    (if (i32.eq (local.get $i) (local.get $len))
      (then
        (global.set $target (local.get $target_temp))
        (return (local.get $i))
      )
    )

    (local.set $target (local.get $target_temp))

    (block $non_ascii_block
      (loop $non_ascii_loop
        (if (i32.lt_u (i32.load8_u (local.get $i)) (i32.const 128)) 
          (then
            (call $parse_ascii (local.get $i) (local.get $start) (local.get $len) (local.get $target) (i32.const 1))
            (local.set $target_temp)
            (local.set $i)

            (if (i32.eq (local.get $i) (i32.const -1))
              (then (return (i32.const -1)))
            )

            (if (i32.eq (i32.load8_u (local.get $i)) (i32.const 34))
              (then 
                (if (i32.ge_s (local.tee $temp (call $find_quote (local.get $i) (local.get $start) (local.get $i))) (i32.const 0))
                  (then
                    (global.set $dq_index (local.get $temp))
                    (global.set $not_extended (i32.eq (local.get $target) (local.get $target_temp)))
                    (global.set $target (local.get $target_temp))
                    (return (local.get $temp)))
                )
              )
            )

            (if (i32.eq (local.get $i) (local.get $len))
              (then
                (global.set $target (local.get $target_temp))
                (return (local.get $i))
              )
            )

            (local.set $target (local.get $target_temp))
          )
        )

        ;; two byte value
        (i32.lt_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 224))
        if
          (block $two_byte_block
            (loop $two_byte_loop 
              (i32.lt_u
                (i32.add (local.get $i) (i32.const 16))
                (local.get $len)
              )
              if
                (local.set $byte_mask
                  (i8x16.bitmask
                    (i16x8.eq
                      (v128.and
                        (local.tee $temp_v128 (v128.load (local.get $i)))
                        (v128.const i16x8 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0 0xC0E0))
                      (v128.const i16x8 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0 0x80C0))))
  
                (if (i32.eq (local.get $byte_mask) (i32.const 0xFFFF))
                  (then
                    (v128.store (local.get $target) (call $decode_8_two_byte_sequences (local.get $temp_v128)))
  
                    (local.set $i (i32.add (local.get $i) (i32.const 16)))
                    (local.set $target (i32.add (local.get $target) (i32.const 16)))
  
                    (br $two_byte_loop)
                  ))

                (v128.store (local.get $target) (call $decode_8_two_byte_sequences (local.get $temp_v128)))
                
                (local.set $trailing (i32.ctz (i32.xor (local.get $byte_mask) (i32.const 0xFFFF))))
                (local.set $i (i32.add (local.get $i) (local.get $trailing)))
                (local.set $target (i32.add (local.get $target) (local.get $trailing)))
                (br $non_ascii_loop)
              end
  
              (br_if $non_ascii_block
                (i32.gt_u
                  (i32.add (local.get $i) (i32.const 4))
                  (local.get $len)
                )
              )

              (local.set $mask (i32.load offset=0 align=1 (local.get $i)))

              (i32.eqz
                (i32.eq 
                  (i32.and 
                    (i32.sub 
                      (local.get $mask) 
                      (i32.const 32960)) 
                    (i32.const 49376))
                  (i32.const 0)
                )
              )
              (br_if $two_byte_block)
  
              (call $in_range_inclusive
                (i32.and (local.get $mask) (i32.const 0xC0FF0000))
                (i32.const 2160197632)
                (i32.const 2162098176)
              )
              if
                (i32.store 
                  (local.get $target) 
                  (call $get_chars_from_two_byte_seq (local.get $mask)))
  
                (local.set $i (i32.add (local.get $i) (i32.const 4)))
                (local.set $target (i32.add (local.get $target) (i32.const 4)))
                (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
  
                (br_if $non_ascii_loop
                  (i32.gt_u
                    (i32.add (local.get $i) (i32.const 4))
                    (local.get $len)
                  ))
                (br $two_byte_loop)
              end
  
              (i32.store16 
                (local.get $target) 
                (call $get_char_two_byte_seq (local.get $mask)))
  
              (local.set $target (i32.add (local.get $target) (i32.const 2)))
              (local.set $i (i32.add (local.get $i) (i32.const 2)))
              (br $non_ascii_loop)
            ))
        end

        ;; i + 4 < length
        (br_if $non_ascii_block
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 4))
            (local.get $len)
          ))

        (local.set $mask (i32.load offset=0 align=1 (local.get $i)))
        
        ;; three byte value
        (i32.eq
          (i32.and 
            (i32.sub 
              (local.get $mask) 
              (i32.const 8421600)) 
            (i32.const 12632304))
          (i32.const 0)
        )
        if
          (i32.eqz
            (i32.or
              (i32.eqz (i32.and (local.get $mask) (i32.const 0x200F)))
              (i32.eqz (i32.and (i32.sub (local.get $mask) (i32.const 8205)) (i32.const 0x200F)))
            )
          )
          if
            (i32.store 
              (local.get $target) 
              (call $get_char_from_three_byte_seq (local.get $mask)))
  
            (local.set $target (i32.add (local.get $target) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 3)))
            (br $non_ascii_loop)
          end
        end

        ;; four byte value
        (i32.eq
          (i32.and 
            (i32.sub 
              (local.get $mask) 
              (i32.const 2155905264)) 
            (i32.const 3233857784))
          (i32.const 0))
        if
          (call $in_range_inclusive
            (call $rotate_r 
              (i32.and (local.get $mask) (i32.const 0xFFFF))
              (i32.const 8)
            )
            (i32.const 4026531984)
            (i32.const 4093640847)
          )
          if
            (i32.store 
              (local.get $target) 
              (call $get_chars_from_four_byte_seq (local.get $mask)))
  
            (local.set $target (i32.add (local.get $target) (i32.const 4)))
            (local.set $i (i32.add (local.get $i) (i32.const 4)))
            (br $non_ascii_loop)
          end
        end

        (if (i32.and (local.get $partial) (i32.gt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len)))
          (then (return (local.get $i)))
          (else (return (i32.const -1))))
      )
    )
    
    (block $non_ascii_tail
      (loop $non_ascii_loop_tail
        ;; i + 1 < length
        (br_if $non_ascii_tail
          (i32.gt_u
            (i32.add (local.get $i) (i32.const 1))
            (local.get $len)
          ))
        
        (if (i32.lt_u (local.tee $temp (i32.load8_u (local.get $i))) (i32.const 128))
          (then
            (if (i32.eq (local.get $temp) (i32.const 34)) 
              (then
                (if (i32.ge_s (local.tee $temp (call $find_quote (local.get $i) (local.get $start) (local.get $i))) (i32.const 0))
                  (then 
                    (global.set $target (local.get $target))
                    (global.set $dq_index (local.get $temp))
                    (return (local.get $temp)))
                )))

            (i32.store16 (local.get $target) (local.get $temp))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (local.set $target (i32.add (local.get $target) (i32.const 2)))
            br $non_ascii_loop_tail
          )
        )

        (local.set $start_byte (i32.sub (local.get $temp) (i32.const 194)))

        (if (i32.lt_u (local.get $start_byte) (i32.const 30))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 1)) (local.get $len)) 
              (then
                (global.set $target (local.get $target))
                (return (local.get $i))))

            (if (i32.ge_u (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 128)) (i32.const 64)) 
              (then (return (i32.const -1))))

            (i32.store16
              (local.get $target)
              (i32.or
                (i32.shl (i32.and (local.get $temp) (i32.const 0x1F)) (i32.const 6))
                (i32.and 
                  (i32.load8_u (i32.add (local.get $i) (i32.const 1)))
                  (i32.const 0x3F)
                ))
            )
            
            (local.set $target (i32.add (local.get $target) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 2)))
            (br $non_ascii_loop_tail)
          )
        )

        (if (i32.lt_u (local.get $start_byte) (i32.const 46))
          (then
            (if (i32.ge_u (i32.add (local.get $i) (i32.const 2)) (local.get $len)) 
              (then
                (global.set $target (local.get $target))
                (return (local.get $i))))
            
            (if (i32.or 
              (i32.ge_u (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 128)) (i32.const 64))
              (i32.ge_u (i32.sub (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 128)) (i32.const 64)))
              (then (return (i32.const -1)))
            )

            (local.set $partialChar (i32.add 
                (i32.shl (local.get $start_byte) (i32.const 12))
                (i32.shl (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 6))
              ))

            (if (i32.or 
              (i32.lt_u (local.get $partialChar) (i32.const 133120)) 
              (i32.lt_u (i32.sub (local.get $partialChar) (i32.const 186368)) (i32.const 2048)))
              (then (return (i32.const -1))))

            (i32.store16
              (local.get $target)
              (i32.or
                (i32.or
                  (i32.shl (i32.and (local.get $temp) (i32.const 0x0F)) (i32.const 12))
                  (i32.shl (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 1))) (i32.const 0x3F)) (i32.const 6))
                )
                (i32.and (i32.load8_u (i32.add (local.get $i) (i32.const 2))) (i32.const 0x3F))
              ))
            
            (local.set $target (i32.add (local.get $target) (i32.const 2)))
            (local.set $i (i32.add (local.get $i) (i32.const 3)))
            br $non_ascii_loop_tail
          )
        )
      )
    )

    (if (i32.and (local.get $partial) (i32.gt_u (i32.add (local.get $i) (i32.const 4)) (local.get $len)))
      (then 
        (global.set $target (local.get $target))
        (return (local.get $i))))
    
    (return (i32.const -1))
  )

  (func $decode_8_two_byte_sequences (param $input v128) (result v128)  
    (local $leads v128)
    (local $conts v128)
  
    (local.set $leads
      (v128.and (local.get $input) (v128.const i16x8 0x001F 0x001F 0x001F 0x001F 0x001F 0x001F 0x001F 0x001F)))
  
    (local.set $leads
      (i16x8.shl (local.get $leads) (i32.const 6)))
  
    (local.set $conts
      (i16x8.shr_u (local.get $input) (i32.const 8)))
  
    (local.set $conts
      (v128.and (local.get $conts) (v128.const i16x8 0x003F 0x003F 0x003F 0x003F 0x003F 0x003F 0x003F 0x003F)))
  
    (v128.or (local.get $leads) (local.get $conts))
  )

  (func $rotate_r (param $value i32) (param $offset i32) (result i32)
    (i32.or
      (i32.shr_u (local.get $value) (local.get $offset))
      (i32.shl (local.get $value) (i32.sub (i32.const 32) (local.get $offset)))
    )
  )

  (func $get_char_two_byte_seq (param $value i32) (result i32)
    (i32.sub
      (i32.sub
        (i32.add
          (i32.and 
            (i32.shr_u (local.get $value) (i32.const 8)) 
            (i32.const 0xFF))
          (i32.shl
            (i32.and (local.get $value) (i32.const 0xFF))
            (i32.const 6)))
      (i32.const 12288))
    (i32.const 128))
  )

  (func $get_chars_from_two_byte_seq (param $value i32) (result i32)
    (i32.or
      (i32.shr_u
        (i32.and (local.get $value) (i32.const 0x3F003F00))
        (i32.const 8)
      )
      (i32.shl
        (i32.and (local.get $value) (i32.const 0x001F001F))
        (i32.const 6)
      )
    )
  )

  (func $get_char_from_three_byte_seq (param $value i32) (result i32)
    (i32.or
      (i32.or
        (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F0000)) (i32.const 16))
        (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F00)) (i32.const 2))
      )
      (i32.shl (i32.and (local.get $value) (i32.const 0xF)) (i32.const 12))
    )
  )

  (func $get_chars_from_four_byte_seq (param $value i32) (result i32)
    (local $result i32)
    (local $byteValue i32)
    (local $temp i32)
    
    ;; Extract byte from value (cast to byte)
    (local.set $byteValue (i32.and (local.get $value) (i32.const 0xFF)))
    
    ;; (value << 8)
    (local.set $temp (i32.shl (local.get $byteValue) (i32.const 8)))
    (local.set $result (local.get $temp))
    
    ;; | ((value & 0x3F00) >> 6)
    (local.set $temp (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F00)) (i32.const 6)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; | ((value & 0x300000) >> 20)
    (local.set $temp (i32.shr_u (i32.and (local.get $value) (i32.const 0x300000)) (i32.const 20)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; | ((value & 0x3F000000) >> 8)
    (local.set $temp (i32.shr_u (i32.and (local.get $value) (i32.const 0x3F000000)) (i32.const 8)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; | ((value & 0xF0000) << 6)
    (local.set $temp (i32.shl (i32.and (local.get $value) (i32.const 0xF0000)) (i32.const 6)))
    (local.set $result (i32.or (local.get $result) (local.get $temp)))
    
    ;; - 64 - 8192 + 2048 + 3690987520u
    (local.set $result (i32.sub (local.get $result) (i32.const 64)))
    (local.set $result (i32.sub (local.get $result) (i32.const 8192)))
    (local.set $result (i32.add (local.get $result) (i32.const 2048)))
    (return (i32.add (local.get $result) (i32.const 0xDC000000)))
  )

  (func $in_range_inclusive (param $value i32) (param $lowerBound i32) (param $upperBound i32) (result i32)
    (i32.le_u
      (i32.sub (local.get $value) (local.get $lowerBound))
      (i32.sub (local.get $upperBound) (local.get $lowerBound))
    )
  )
)