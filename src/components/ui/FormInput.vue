<template>
  <div class="form-field" :class="{ 'has-error': showError }">
    <!-- Label -->
    <label 
      v-if="label" 
      :for="inputId" 
      class="form-label"
      :class="{ 'required': required }"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    
    <!-- Input wrapper -->
    <div class="input-wrapper" :class="inputWrapperClass">
      <!-- Prefix icon/text -->
      <div v-if="$slots.prefix || prefix" class="input-prefix">
        <slot name="prefix">{{ prefix }}</slot>
      </div>
      
      <!-- Input element -->
      <input
        v-if="type !== 'textarea'"
        :id="inputId"
        ref="inputRef"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :min="min"
        :max="max"
        :step="step"
        :autocomplete="autocomplete"
        class="form-input"
        :class="inputClass"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown.enter="$emit('enter', $event)"
      />
      
      <!-- Textarea -->
      <textarea
        v-else
        :id="inputId"
        ref="inputRef"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        class="form-input form-textarea"
        :class="inputClass"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      ></textarea>
      
      <!-- Suffix icon/text -->
      <div v-if="$slots.suffix || suffix" class="input-suffix">
        <slot name="suffix">{{ suffix }}</slot>
      </div>
      
      <!-- Clear button -->
      <button
        v-if="clearable && modelValue"
        type="button"
        class="input-clear"
        @click="handleClear"
        tabindex="-1"
      >
        ✕
      </button>
      
      <!-- Password toggle -->
      <button
        v-if="type === 'password'"
        type="button"
        class="input-toggle-password"
        @click="togglePasswordVisibility"
        tabindex="-1"
      >
        {{ showPassword ? '🙈' : '👁️' }}
      </button>
    </div>
    
    <!-- Helper text / Error -->
    <div class="input-footer">
      <p v-if="showError" class="error-message">
        {{ error }}
      </p>
      <p v-else-if="hint" class="hint-message">
        {{ hint }}
      </p>
      
      <!-- Character count -->
      <span v-if="showCharCount" class="char-count">
        {{ charCount }}<template v-if="maxlength">/{{ maxlength }}</template>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, useId } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  clearable: {
    type: Boolean,
    default: false
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  min: {
    type: [Number, String],
    default: undefined
  },
  max: {
    type: [Number, String],
    default: undefined
  },
  step: {
    type: [Number, String],
    default: undefined
  },
  rows: {
    type: Number,
    default: 3
  },
  maxlength: {
    type: Number,
    default: undefined
  },
  showCharCount: {
    type: Boolean,
    default: false
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'clear', 'enter'])

const inputRef = ref(null)
const isFocused = ref(false)
const showPassword = ref(false)

// Generar ID único
const inputId = `input-${useId()}`

const showError = computed(() => props.error !== null && props.error !== undefined)

const charCount = computed(() => {
  if (typeof props.modelValue === 'string') {
    return props.modelValue.length
  }
  return String(props.modelValue || '').length
})

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const inputWrapperClass = computed(() => ({
  'input-focused': isFocused.value,
  'input-disabled': props.disabled,
  'input-readonly': props.readonly,
  'input-error': showError.value,
  [`input-size-${props.size}`]: true
}))

const inputClass = computed(() => ({
  'pl-8': props.prefix || props.$slots?.prefix,
  'pr-8': props.suffix || props.$slots?.suffix || props.clearable || props.type === 'password'
}))

const handleInput = (event) => {
  let value = event.target.value
  
  // Limitar longitud si se especifica
  if (props.maxlength && value.length > props.maxlength) {
    value = value.slice(0, props.maxlength)
    event.target.value = value
  }
  
  emit('update:modelValue', value)
}

const handleBlur = (event) => {
  isFocused.value = false
  emit('blur', event)
}

const handleFocus = (event) => {
  isFocused.value = true
  emit('focus', event)
}

const handleClear = () => {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Exponer métodos para uso externo
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select()
})
</script>

<style scoped>
.form-field {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.375rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background-color: white;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Sizes */
.input-size-sm .form-input {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.input-size-md .form-input {
  padding: 0.5rem 0.875rem;
}

.input-size-lg .form-input {
  padding: 0.75rem 1rem;
  font-size: 1.05rem;
}

/* States */
.input-disabled .form-input {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.7;
}

.input-readonly .form-input {
  background-color: #f9fafb;
}

.input-error .form-input {
  border-color: #ef4444;
}

.input-error .form-input:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.input-focused .form-input {
  border-color: #3b82f6;
}

/* Prefix/Suffix */
.input-prefix,
.input-suffix {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 0.9rem;
  pointer-events: none;
}

.input-prefix {
  left: 0.75rem;
}

.input-suffix {
  right: 0.75rem;
}

/* Buttons */
.input-clear,
.input-toggle-password {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 0.875rem;
  color: #9ca3af;
  transition: color 0.2s;
}

.input-clear:hover,
.input-toggle-password:hover {
  color: #6b7280;
}

/* Footer */
.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
  min-height: 1.25rem;
}

.error-message {
  font-size: 0.8rem;
  color: #ef4444;
  margin: 0;
}

.hint-message {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

.char-count {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-left: auto;
}

/* Error state animation */
.has-error .form-input {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}
</style>
