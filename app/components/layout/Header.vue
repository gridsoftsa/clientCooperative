<script setup lang="ts">
import { getBreadcrumbSegmentTitle } from '~/constants/breadcrumb-titles'

const route = useRoute()

function setLinks() {
  const path = route.path || '/'
  if (path === '/') {
    return [{ title: 'Dashboard', href: '/' }]
  }

  const segments = path.split('/').filter(item => item !== '')

  const breadcrumbs = segments.map((item, index) => ({
    title: getBreadcrumbSegmentTitle(item),
    href: `/${segments.slice(0, index + 1).join('/')}`,
  }))

  return [{ title: 'Dashboard', href: '/' }, ...breadcrumbs]
}

const links = ref<{
  title: string
  href: string
}[]>(setLinks())

watch(() => route.path, (val) => {
  if (val !== undefined) {
    links.value = setLinks()
  }
})
</script>

<template>
  <header
    class="app-header sticky top-0 z-10 h-(--header-height) flex items-center gap-4 border-b border-header-border bg-header px-4 text-header-foreground md:peer-data-[variant=inset]:top-2 md:px-6 md:rounded-tl-xl md:rounded-tr-xl
      hover:[&_[data-slot=sidebar-trigger]]:bg-header-foreground/10"
  >
    <div class="w-full flex h-4 items-center gap-4">
      <SidebarTrigger />
      <Separator class="!bg-header-foreground/25" orientation="vertical" />
      <BaseBreadcrumbCustom :links="links" />
    </div>
    <div class="ml-auto">
      <slot />
    </div>
  </header>
</template>

<style scoped>

</style>
