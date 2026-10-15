<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'manual_ver',
})

type ManualSection = {
  heading: string
  paragraphs: string[]
  items: string[]
}

type ManualChapter = {
  id: string
  title: string
  sections: ManualSection[]
}

type ManualDocument = {
  title: string
  subtitle: string
  chapters: ManualChapter[]
}

const { $api } = useNuxtApp()
const { downloadReportFile } = useReportExport()

const document = ref<ManualDocument | null>(null)
const loading = ref(true)
const exporting = ref(false)
const error = ref('')

async function loadManual() {
  loading.value = true
  error.value = ''
  try {
    const res = await $api<{ data: ManualDocument }>('/manual')
    document.value = res.data
  }
  catch {
    error.value = 'No se pudo cargar el manual.'
  }
  finally {
    loading.value = false
  }
}

async function exportPdf() {
  exporting.value = true
  error.value = ''
  try {
    await downloadReportFile('/manual/pdf', {}, 'manual-de-operacion.pdf', 'application/pdf')
  }
  catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo generar el PDF.'
  }
  finally {
    exporting.value = false
  }
}

onMounted(() => {
  loadManual()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ document?.title || 'Manual de operación' }}
          </h2>
          <p class="max-w-3xl text-sm text-muted-foreground">
            {{ document?.subtitle || 'Qué hace cada módulo, quién lo usa y cómo recorre un crédito.' }}
          </p>
        </div>
        <Button :disabled="loading || exporting || !document" @click="exportPdf">
          <Icon name="i-lucide-file-down" class="mr-2 h-4 w-4" />
          {{ exporting ? 'Generando PDF…' : 'Exportar PDF' }}
        </Button>
      </div>

      <p v-if="error" class="text-sm text-destructive">
        {{ error }}
      </p>

      <p v-if="loading" class="text-sm text-muted-foreground">
        Cargando el manual…
      </p>

      <div v-else-if="document" class="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav class="lg:sticky lg:top-4 lg:self-start">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Capítulos
          </p>
          <div class="flex flex-col gap-1">
            <a
              v-for="chapter in document.chapters"
              :key="chapter.id"
              :href="`#${chapter.id}`"
              class="rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {{ chapter.title }}
            </a>
          </div>
        </nav>

        <div class="space-y-8">
          <article
            v-for="chapter in document.chapters"
            :id="chapter.id"
            :key="chapter.id"
            class="scroll-mt-4 space-y-4"
          >
            <h3 class="text-xl font-semibold tracking-tight">
              {{ chapter.title }}
            </h3>
            <section
              v-for="section in chapter.sections"
              :key="section.heading"
              class="space-y-2"
            >
              <h4 class="text-base font-medium">
                {{ section.heading }}
              </h4>
              <p
                v-for="(paragraph, index) in section.paragraphs"
                :key="`${section.heading}-p-${index}`"
                class="text-sm leading-relaxed text-foreground"
              >
                {{ paragraph }}
              </p>
              <ul v-if="section.items.length" class="list-disc space-y-1 pl-5 text-sm leading-relaxed">
                <li v-for="item in section.items" :key="item">
                  {{ item }}
                </li>
              </ul>
            </section>
          </article>
        </div>
      </div>
    </div>
  </SettingsLayout>
</template>
