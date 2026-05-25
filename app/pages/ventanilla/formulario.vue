<script setup lang="ts">
definePageMeta({
  layout: false,
})

const ventanillaApi = useVentanillaApi()

const senderName = ref('')
const senderEmail = ref('')
const senderIdentifier = ref('')
const subject = ref('')
const body = ref('')
const fileRows = ref<Array<{ file: File | null; title: string }>>([{ file: null, title: 'Documento principal' }])
const saving = ref(false)
const errorMessage = ref('')
const receivedId = ref<number | null>(null)

function addFileRow() {
  fileRows.value.push({ file: null, title: '' })
}

function removeFileRow(index: number) {
  if (fileRows.value.length <= 1) {
    return
  }
  fileRows.value.splice(index, 1)
}

function onFileChange(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const row = fileRows.value[index]
  if (!row) {
    return
  }
  row.file = file
  if (file && !row.title.trim()) {
    row.title = file.name
  }
}

async function submit() {
  errorMessage.value = ''
  receivedId.value = null

  if (!senderName.value.trim() || !senderEmail.value.trim() || !subject.value.trim()) {
    errorMessage.value = 'Nombre, correo y asunto son obligatorios.'
    return
  }

  const withFiles = fileRows.value.filter((row: { file: File | null; title: string }) => row.file)
  if (withFiles.length === 0) {
    errorMessage.value = 'Adjunte al menos un documento.'
    return
  }

  const fd = new FormData()
  fd.append('sender_name', senderName.value.trim())
  fd.append('sender_email', senderEmail.value.trim())
  if (senderIdentifier.value.trim()) {
    fd.append('sender_identifier', senderIdentifier.value.trim())
  }
  fd.append('subject', subject.value.trim())
  if (body.value.trim()) {
    fd.append('body', body.value.trim())
  }

  withFiles.forEach((row: { file: File | null; title: string }, index: number) => {
    if (!row.file) {
      return
    }
    fd.append(`files[${index}][file]`, row.file)
    fd.append(`files[${index}][title]`, row.title.trim() || row.file.name)
  })

  saving.value = true
  try {
    const created = await ventanillaApi.createPublicIntake(fd)
    receivedId.value = created.id
    senderName.value = ''
    senderEmail.value = ''
    senderIdentifier.value = ''
    subject.value = ''
    body.value = ''
    fileRows.value = [{ file: null, title: 'Documento principal' }]
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    errorMessage.value = first ?? err.data?.message ?? 'No se pudo enviar la solicitud.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-muted/30 px-4 py-8">
    <div class="mx-auto max-w-3xl space-y-6">
      <div class="rounded-2xl border bg-background p-6 shadow-sm">
        <p class="text-muted-foreground text-sm">
          Ventanilla única
        </p>
        <h1 class="text-2xl font-semibold tracking-tight">
          Formulario web de radicación
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Envíe su solicitud y anexos. El equipo de ventanilla la clasificará antes de generar el radicado oficial.
        </p>
      </div>

      <div v-if="receivedId" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Solicitud recibida correctamente. Número interno de recepción: {{ receivedId }}.
      </div>
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>

      <form class="space-y-4 rounded-2xl border bg-background p-6 shadow-sm" @submit.prevent="submit">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Nombre completo *</Label>
            <Input v-model="senderName" />
          </div>
          <div class="space-y-2">
            <Label>Correo electrónico *</Label>
            <Input v-model="senderEmail" type="email" />
          </div>
          <div class="space-y-2">
            <Label>Identificación</Label>
            <Input v-model="senderIdentifier" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Asunto *</Label>
            <Input v-model="subject" maxlength="500" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Mensaje</Label>
            <Textarea v-model="body" rows="5" />
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <Label>Documentos anexos *</Label>
            <Button type="button" variant="outline" size="sm" @click="addFileRow">
              <Icon name="i-lucide-plus" class="mr-1 size-4" />
              Agregar anexo
            </Button>
          </div>
          <div
            v-for="(row, index) in fileRows"
            :key="index"
            class="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <Input v-model="row.title" placeholder="Título del documento" />
            <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt" @change="onFileChange(index, $event)" />
            <Button
              v-if="fileRows.length > 1"
              type="button"
              variant="ghost"
              size="icon"
              @click="removeFileRow(index)"
            >
              <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div class="flex justify-end">
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Enviando…' : 'Enviar solicitud' }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>
