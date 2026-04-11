<script setup lang="ts">
import type { ThemeColor, ThemeType } from '@/constants/themes'
import { THEME_COLORS, THEME_TYPE } from '@/constants/themes'

const { theme, updateAppSettings } = useAppSettings()

const allColors: ThemeColor[] = THEME_COLORS.map(color => color.name)
const allTypes: ThemeType[] = THEME_TYPE

watch(() => theme.value?.color, () => {
  setClassColor()
})

function setClassColor() {
  document.body.classList.remove(
    ...allColors.map(color => `color-${color}`),
  )
  document.body.classList.add(`color-${theme.value?.color || 'default'}`)
}

watch(() => theme.value?.type, () => {
  setClassType()
})

function setClassType() {
  document.body.classList.remove(
    ...allTypes.map(type => `theme-${type}`),
  )
  document.body.classList.add(`theme-${theme.value?.type || 'default'}`)
}

function backgroundColor(color: ThemeColor) {
  const bg = THEME_COLORS.find(theme => theme.name === color)
  return bg?.value
}

const colorMode = useColorMode()

const themeColorLabelEs: Record<string, string> = {
  default: 'Predeterminado',
  blue: 'Azul',
  green: 'Verde',
  red: 'Rojo',
  rose: 'Rosa',
  violet: 'Violeta',
  orange: 'Naranja',
  yellow: 'Amarillo',
  teal: 'Verde azulado',
}

const themeTypeLabelEs: Record<string, string> = {
  default: 'Predeterminado',
  scaled: 'Escalado',
  mono: 'Monocromático',
}

function colorLabel(name: string): string {
  return themeColorLabelEs[name] ?? name
}

function typeLabel(name: string): string {
  return themeTypeLabelEs[name] ?? name
}
</script>

<template>
  <div class="grid gap-6">
    <div class="space-y-1.5">
      <Label>Color</Label>
      <div class="grid grid-cols-3 gap-2">
        <template v-for="col in allColors" :key="col">
          <Button
            class="justify-start gap-2"
            variant="outline"
            :class="{ '!border-primary border-2 !bg-primary/10': theme?.color === col }"
            @click="updateAppSettings({ theme: { color: col } })"
          >
            <span class="h-5 w-5 flex items-center justify-center rounded-full border border-white" :style="{ backgroundColor: backgroundColor(col) }">
              <Icon v-if="col === theme?.color" name="i-radix-icons-check" size="16" class="text-white" />
            </span>
            <span class="text-xs">{{ colorLabel(col) }}</span>
          </Button>
        </template>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>Estilo</Label>
      <div class="grid grid-cols-3 gap-2">
        <template v-for="themeType in allTypes" :key="themeType">
          <Button
            class="justify-center gap-2"
            variant="outline"
            :class="{ '!border-primary border-2 !bg-primary/10': theme?.type === themeType }"
            @click="updateAppSettings({ theme: { type: themeType } })"
          >
            <span class="text-xs">{{ typeLabel(themeType) }}</span>
          </Button>
        </template>
      </div>
    </div>
    <div class="space-y-1.5">
      <Label>Tema</Label>
      <div class="grid grid-cols-3 gap-2">
        <Button
          class="justify-center gap-2"
          variant="outline"
          :class="{ '!border-primary border-2 !bg-primary/10': colorMode.preference === 'light' }"
          @click="colorMode.preference = 'light'"
        >
          <Icon name="i-ph-sun-dim-duotone" size="16" />
          <span class="text-xs">Claro</span>
        </Button>
        <Button
          class="justify-center gap-2"
          variant="outline"
          :class="{ '!border-primary border-2 !bg-primary/10': colorMode.preference === 'dark' }"
          @click="colorMode.preference = 'dark'"
        >
          <Icon name="i-ph-moon-stars-duotone" size="16" />
          <span class="text-xs">Oscuro</span>
        </Button>
        <Button
          class="justify-center gap-2"
          variant="outline"
          :class="{ '!border-primary border-2 !bg-primary/10': colorMode.preference === 'system' }"
          @click="colorMode.preference = 'system'"
        >
          <Icon name="i-lucide-monitor" size="16" />
          <span class="text-xs">Sistema</span>
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>
