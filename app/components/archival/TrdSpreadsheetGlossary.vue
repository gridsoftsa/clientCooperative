<script setup lang="ts">
import {
  buildTrdSpreadsheetGlossarySections,
  type TrdSpreadsheetGlossaryContext,
} from '~/constants/trd-spreadsheet-glossary'

const props = defineProps<{
  context: TrdSpreadsheetGlossaryContext
}>()

const sections = computed(() => buildTrdSpreadsheetGlossarySections(props.context))
</script>

<template>
  <div class="trd-spreadsheet-glossary border-x border-b border-slate-400 bg-[#fafafa] px-4 py-3">
    <p class="mb-3 text-center text-[11px] font-bold uppercase tracking-wide text-[#0f766e]">
      Glosario
    </p>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="section in sections" :key="section.title" class="space-y-1.5">
        <p class="text-[10px] font-semibold uppercase text-slate-700">
          {{ section.title }}
        </p>
        <ul class="space-y-1 text-[10px] leading-snug text-slate-800">
          <li v-for="item in section.items" :key="`${section.title}-${item.term}`">
            <span class="font-semibold text-slate-900">{{ item.term }}:</span>
            {{ item.definition }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
