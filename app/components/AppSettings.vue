<script setup lang="ts">
const [DefineTemplate, ReuseTemplate] = createReusableTemplate()
const isDesktop = useMediaQuery('(min-width: 768px)')

const isOpen = ref(false)

const { sidebar, updateAppSettings } = useAppSettings()

const direction = useTextDirection()

function handleChangeDirection(dir: 'ltr' | 'rtl') {
  direction.value = dir
  updateAppSettings({ sidebar: { side: dir === 'rtl' ? 'right' : 'left' } })
}
</script>

<template>
  <DefineTemplate>
    <div class="space-y-3">
      <Badge>Diseño</Badge>
      <div class="grid gap-6">
        <div class="space-y-1.5">
          <Label>Tipo de barra</Label>
          <div class="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': sidebar?.variant === 'sidebar' }"
              @click="updateAppSettings({ sidebar: { variant: 'sidebar' } })"
            >
              Lateral
            </Button>
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': sidebar?.variant === 'floating' }"
              @click="updateAppSettings({ sidebar: { variant: 'floating' } })"
            >
              Flotante
            </Button>
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': sidebar?.variant === 'inset' }"
              @click="updateAppSettings({ sidebar: { variant: 'inset' } })"
            >
              Incrustada
            </Button>
          </div>
        </div>
        <div class="space-y-1.5">
          <Label>Dirección</Label>
          <div class="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': direction === 'ltr' }"
              @click="handleChangeDirection('ltr')"
            >
              LTR
            </Button>
            <Button
              variant="outline"
              :class="{ 'border-primary! border-2 bg-primary/10!': direction === 'rtl' }"
              @click="handleChangeDirection('rtl')"
            >
              RTL
            </Button>
          </div>
        </div>
      </div>
    </div>
  </DefineTemplate>

  <Sheet v-if="isDesktop" v-model:open="isOpen">
    <SheetTrigger as-child>
      <Button
        class="fixed top-1/2 z-50"
        :class="direction === 'rtl' ? '-left-3 pl-6' : '-right-3 pr-6'"
        title="Personalizar plantilla"
      >
        <Icon name="i-lucide-settings" class="animate-spin-slow" size="18" />
        <span class="sr-only">Personalizar plantilla</span>
      </Button>
    </SheetTrigger>
    <SheetContent :side="direction === 'rtl' ? 'left' : 'right'">
      <SheetHeader class="p-6 pb-0">
        <SheetTitle>Personalizar plantilla</SheetTitle>
        <SheetDescription>Vista previa en tiempo real</SheetDescription>
      </SheetHeader>
      <ScrollArea class="h-[calc(100vh-100px)]">
        <div class="flex flex-col gap-6 px-6">
          <div class="space-y-3">
            <Badge>Tema</Badge>
            <ThemeCustomize />
          </div>
          <Separator />
          <ReuseTemplate />
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>

  <Drawer v-else v-model:open="isOpen">
    <DrawerTrigger as-child>
      <Button class="fixed top-1/2 z-50 -right-3 pr-6" title="Personalizar plantilla">
        <Icon name="i-lucide-settings" class="animate-spin-slow" size="18" />
        <span class="sr-only">Personalizar plantilla</span>
      </Button>
    </DrawerTrigger>
    <DrawerContent class="max-h-[97%]">
      <DrawerHeader class="text-center sm:text-center">
        <DrawerTitle>Personalizar plantilla</DrawerTitle>
        <DrawerDescription>Vista previa en tiempo real</DrawerDescription>
      </DrawerHeader>
      <div class="mx-auto max-w-md w-full overflow-auto overflow-y-auto px-4 pb-6 space-y-6">
        <div class="space-y-3">
          <Badge>Tema</Badge>
          <ThemeCustomize />
        </div>
        <Separator />
        <ReuseTemplate />
      </div>
    </DrawerContent>
  </Drawer>
</template>

<style scoped>

</style>
