<script setup lang="ts">
import type { RoleAssignedUser } from '~/types/role'
import { roleAssignedUserLabel } from '~/constants/role-labels'

withDefaults(defineProps<{
  users?: RoleAssignedUser[]
}>(), {
  users: () => [],
})
</script>

<template>
  <p v-if="users.length === 0" class="text-sm text-muted-foreground">
    Ningún usuario tiene este rol
  </p>
  <ul
    v-else
    class="max-h-[50vh] space-y-2 overflow-y-auto sm:max-h-80"
  >
    <li
      v-for="user in users"
      :key="user.id"
      class="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <div class="min-w-0">
        <p class="truncate text-sm font-medium">
          {{ roleAssignedUserLabel(user) }}
        </p>
        <p class="truncate text-xs text-muted-foreground">
          {{ user.email }}
        </p>
      </div>
      <Badge v-if="!user.is_active" variant="secondary" class="w-fit shrink-0">
        Cuenta inactiva
      </Badge>
    </li>
  </ul>
</template>
