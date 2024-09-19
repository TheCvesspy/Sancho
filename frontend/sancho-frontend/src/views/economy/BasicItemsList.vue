<!-- src/views/economy/BasicItemsList.vue -->

<template>
  <div>
    <h1>Basic Items List</h1>
    <DataTable :value="basicItems" paginator rows="10" class="p-datatable-striped">
      <Column field="id" header="ID" sortable></Column>
      <Column field="name" header="Name" sortable></Column>
      <Column field="unit_point_price" header="Unit Point Price" sortable></Column>
      <Column field="pack_size" header="Pack Size" sortable></Column>
      <Column field="pack_price" header="Pack Price" sortable></Column>
      <Column field="buy_out_price" header="Buy Out Price" sortable></Column>
      <!-- Add edit and delete buttons as needed -->
    </DataTable>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import api from '@/services/api';
import { useToast } from 'primevue/usetoast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

export default {
  name: 'BasicItemsList',
  components: {
    DataTable,
    Column,
  },
  setup() {
    const toast = useToast();
    const basicItems = ref([]);

    const fetchBasicItems = async () => {
      try {
        const response = await api.get('/economy/basic-items');
        basicItems.value = response.data.basic_items;
      } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch Basic Items', life: 3000 });
      }
    };

    onMounted(() => {
      fetchBasicItems();
    });

    return {
      basicItems,
    };
  },
};
</script>

<style scoped>
/* Add any necessary styles here */
</style>
