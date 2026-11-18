/** Convierte claves crudas de Laravel (`validation.unique`) en texto usable en la UI. */
export function humanizeLaravelValidationMessage(
  raw: string | undefined,
  field?: string,
): string | undefined {
  if (!raw?.trim()) {
    return undefined
  }

  const message = raw.trim()
  const fieldKey = (field ?? '').split('.')[0] ?? ''

  if (message === 'validation.unique' && fieldKey === 'email') {
    return 'Ya existe un usuario con este correo. Si la cuenta ya está en el sistema, selecciónela al crear el funcionario; no la vuelva a crear.'
  }

  if (message === 'validation.unique' && fieldKey === 'user_id') {
    return 'Este usuario ya está vinculado a un funcionario. Búsquelo en el directorio de funcionarios.'
  }

  if (message === 'validation.unique') {
    return 'Ese valor ya está registrado.'
  }

  if (message === 'validation.exists' && fieldKey === 'roles') {
    return 'El rol seleccionado no existe en el sistema. Elija uno de la lista o ejecute las migraciones de roles.'
  }

  if (message === 'validation.exists') {
    return 'El valor seleccionado no es válido.'
  }

  if (message === 'validation.required') {
    return 'Este campo es obligatorio.'
  }

  if (message.startsWith('validation.')) {
    return 'Revise los datos del formulario; hay un valor que el servidor no puede guardar.'
  }

  return message
}

export function firstLaravelFieldError(
  errors: Record<string, string[] | string> | undefined,
): { field: string, message: string } | null {
  if (!errors) {
    return null
  }

  for (const [field, value] of Object.entries(errors)) {
    const raw = Array.isArray(value) ? value[0] : value
    const message = humanizeLaravelValidationMessage(
      typeof raw === 'string' ? raw : undefined,
      field,
    )
    if (message) {
      return { field, message }
    }
  }

  return null
}
