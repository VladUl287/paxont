
(module
  (memory (export "memory") 256)
    
  (func $countSignificantBits64 (param $value i64) (result i32)
    (if (result i32) (i64.eqz (local.get $value))
      (then (i32.const 0))
      (else (i32.wrap_i64 (i64.clz (local.get $value))))
    )
  )
  
  (func $rightShiftWithRounding (param $mantissa i64) (param $shift i32) (param $hasZeroTail i32) (result i64)
    (local $result i64)
    (local $droppedBits i64)
    
    (if (i32.le_s (local.get $shift) (i32.const 0))
      (then (return (local.get $mantissa)))
    )
    
    (local.set $result 
      (i64.shr_u 
        (local.get $mantissa) 
        (i64.extend_i32_u (i32.sub (local.get $shift) (i32.const 1)))
      )
    )
    
    (local.set $droppedBits 
      (i64.and 
        (local.get $mantissa) 
        (i64.sub 
          (i64.shl (i64.const 1) (i64.extend_i32_u (local.get $shift)))
          (i64.const 1)
        )
      )
    )
    
    (if (i32.and
          (i64.ne (i64.and (local.get $droppedBits) (i64.const 1)) (i64.const 0))
          (i32.or
            (i64.ne 
              (i64.shr_u (local.get $droppedBits) (i64.const 1))
              (i64.const 0)
            )
            (i32.eqz (local.get $hasZeroTail))
          )
        )
      (then
        (local.set $result (i64.add (local.get $result) (i64.const 1)))
      )
    )
    
    (local.get $result)
  )
  
  (func $assembleFloatingPointBits (param $mantissa i64) (param $exponent i32) (param $hasZeroTail i32) (result i64)
    (local $initialMantissaBits i32)
    (local $normalMantissaShift i32)
    (local $normalExponent i32)
    (local $resultMantissa i64)
    (local $resultExponent i32)
    (local $denormalMantissaShift i32)
    
    (local.set $initialMantissaBits (call $countSignificantBits64 (local.get $mantissa)))
    
    (local.set $normalMantissaShift 
      (i32.sub (i32.const 52) (local.get $initialMantissaBits))
    )
    
    (local.set $normalExponent 
      (i32.sub (local.get $exponent) (local.get $normalMantissaShift))
    )
    
    (local.set $resultMantissa (local.get $mantissa))
    (local.set $resultExponent (local.get $normalExponent))
    
    (if (i32.gt_s (local.get $normalExponent) (i32.const 1023))
      (then
        (return (i64.const 0x7FF0000000000000))
      )
    )
    
    (if (i32.lt_s (local.get $normalExponent) (i32.const -1022))
      (then
        (local.set $denormalMantissaShift
          (i32.add
            (i32.add (local.get $normalMantissaShift) (local.get $normalExponent))
            (i32.sub (i32.const 1023) (i32.const 1))
          )
        )
        
        (local.set $resultExponent (i32.sub (i32.const 0) (i32.const 1023)))
        
        (if (i32.lt_s (local.get $denormalMantissaShift) (i32.const 0))
          (then
            (local.set $resultMantissa
              (call $rightShiftWithRounding 
                (local.get $resultMantissa)
                (i32.sub (i32.const 0) (local.get $denormalMantissaShift))
                (local.get $hasZeroTail)
              )
            )
            
            (if (i64.eqz (local.get $resultMantissa))
              (then (return (i64.const 0)))
            )
            
            (if (i64.ne 
                  (i64.and (local.get $resultMantissa) (i64.const 0xFFF0000000000000))
                  (i64.const 0))
              (then
                (local.set $resultExponent
                  (i32.sub
                    (i32.sub (local.get $exponent) 
                      (i32.add (local.get $denormalMantissaShift) (i32.const 1)))
                    (local.get $normalMantissaShift)
                  )
                )
              )
            )
          )
          (else
            (local.set $resultMantissa 
              (i64.shl (local.get $resultMantissa) 
                (i64.extend_i32_u (local.get $denormalMantissaShift))
              )
            )
          )
        )
      )
      (else
        (if (i32.lt_s (local.get $normalMantissaShift) (i32.const 0))
          (then
            (local.set $resultMantissa
              (call $rightShiftWithRounding
                (local.get $resultMantissa)
                (i32.sub (i32.const 0) (local.get $normalMantissaShift))
                (local.get $hasZeroTail)
              )
            )
            
            (if (i64.gt_u (local.get $resultMantissa) (i64.const 0x001FFFFFFFFFFFFF))
              (then
                (local.set $resultMantissa (i64.shr_u (local.get $resultMantissa) (i64.const 1)))
                (local.set $resultExponent (i32.add (local.get $resultExponent) (i32.const 1)))
                
                (if (i32.gt_s (local.get $resultExponent) (i32.const 1023))
                  (then
                    (return (i64.const 0x7FF0000000000000))
                  )
                )
              )
            )
          )
          (else
            (if (i32.gt_s (local.get $normalMantissaShift) (i32.const 0))
              (then
                (local.set $resultMantissa
                  (i64.shl (local.get $resultMantissa) 
                    (i64.extend_i32_u (local.get $normalMantissaShift))
                  )
                )
              )
            )
          )
        )
      )
    )
    
    (local.set $resultMantissa 
      (i64.and (local.get $resultMantissa) (i64.const 0x000FFFFFFFFFFFFF))
    )
    
    (i64.or
      (i64.shl
        (i64.extend_i32_u 
          (i32.add (local.get $resultExponent) (i32.const 1023))
        )
        (i64.const 52)
      )
      (local.get $resultMantissa)
    )
  )
  
  (func (export "convertToFloatingPointBits") 
    (param $value i64) (param $integerBitsOfPrecision i32) (param $hasNonZeroFractionalPart i32) 
    (result i64)
    
    (local $baseExponent i32)
    (local $mantissa i64)
    (local $exponent i32)
    (local $hasZeroTail i32)
    
    (local.set $baseExponent (i32.const 52))
    
    (local.set $mantissa (local.get $value))
    (local.set $exponent (local.get $baseExponent))
    (local.set $hasZeroTail 
      (i32.eqz (local.get $hasNonZeroFractionalPart))
    )
    
    (call $assembleFloatingPointBits
      (local.get $mantissa)
      (local.get $exponent)
      (local.get $hasZeroTail)
    )
  )
  
  (func (export "numberToFloatingPointBits")
    (param $integerValue i64) 
    (param $fractionalNumerator i64)
    (param $fractionalDenominator i64)
    (param $integerBitsOfPrecision i32)
    (param $hasFraction i32)
    (result i64)
    
    (local $requiredBits i32)
    (local $fractionalShift i32)
    (local $requiredFracBits i32)
    (local $remainingBits i32)
    (local $integerMantissa i64)
    (local $fractionalMantissa i64)
    (local $completeMantissa i64)
    (local $finalExponent i32)
    (local $hasZeroTail i32)
    
    (local.set $requiredBits (i32.const 53))
    
    (if (i32.or 
          (i32.ge_u (local.get $integerBitsOfPrecision) (local.get $requiredBits))
          (i32.eqz (local.get $hasFraction)))
      (then
        (return
          (call $assembleFloatingPointBits
            (local.get $integerValue)
            (i32.const 52)
            (i32.eqz (local.get $hasFraction))
          )
        )
      )
    )
    
    (local.set $fractionalShift (i32.const 0))
    (if (i64.gt_u (local.get $fractionalDenominator) (local.get $fractionalNumerator))
      (then
        (local.set $fractionalShift (i32.const 1))
      )
    )
    
    (local.set $requiredFracBits 
      (i32.sub (local.get $requiredBits) (local.get $integerBitsOfPrecision))
    )
    (local.set $remainingBits (local.get $requiredFracBits))
    
    (if (i32.and
          (i32.gt_u (local.get $integerBitsOfPrecision) (i32.const 0))
          (i32.gt_u (local.get $fractionalShift) (local.get $remainingBits)))
      (then
        (return
          (call $assembleFloatingPointBits
            (local.get $integerValue)
            (i32.const 52)
            (i32.const 0)
          )
        )
      )
    )
    
    (if (i32.gt_u (local.get $integerBitsOfPrecision) (i32.const 0))
      (then
        (local.set $remainingBits 
          (i32.sub (local.get $remainingBits) (local.get $fractionalShift))
        )
      )
    )
    
    (local.set $fractionalMantissa
      (i64.div_u 
        (i64.shl (local.get $fractionalNumerator) 
          (i64.extend_i32_u (local.get $remainingBits)))
        (local.get $fractionalDenominator)
      )
    )
    
    (local.set $integerMantissa (local.get $integerValue))
    (local.set $completeMantissa
      (i64.or
        (i64.shl (local.get $integerMantissa) 
          (i64.extend_i32_u (local.get $requiredFracBits)))
        (local.get $fractionalMantissa)
      )
    )
    
    (if (i32.gt_u (local.get $integerBitsOfPrecision) (i32.const 0))
      (then
        (local.set $finalExponent 
          (i32.sub (local.get $integerBitsOfPrecision) (i32.const 2))
        )
      )
      (else
        (local.set $finalExponent 
          (i32.sub
            (i32.const 0)
            (i32.add (local.get $fractionalShift) (i32.const 1))
          )
        )
      )
    )
    
    (local.set $hasZeroTail (i32.const 1))
    
    (call $assembleFloatingPointBits
      (local.get $completeMantissa)
      (local.get $finalExponent)
      (local.get $hasZeroTail)
    )
  )
)