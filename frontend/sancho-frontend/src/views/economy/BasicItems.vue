<!-- sancho/frontend/sancho-frontend/src/views/economy/BasicItems.vue -->

<template>
  <div>
    <h1>Basic Items</h1>
    <Card class="form-card">
      <h2>Add New Basic Item</h2>
      <form @submit.prevent="submitForm">
        <div class="field">
          <label for="name">Name:</label>
          <InputText id="name" v-model="form.name" required />
        </div>

        <div class="field">
          <label for="unit_point_price">Unit Point Price:</label>
          <InputNumber
            id="unit_point_price"
            v-model="form.unit_point_price"
            :min="0"
            required
            mode="decimal"
            :minFractionDigits="2"
          />
        </div>

        <div class="field">
          <label for="pack_size">Pack Size:</label>
          <InputNumber
            id="pack_size"
            v-model="form.pack_size"
            :min="1"
            required
            mode="decimal"
            :minFractionDigits="0"
          />
        </div>

        <div class="field">
          <label for="pack_price">Pack Price:</label>
          <InputNumber
            id="pack_price"
            v-model="form.pack_price"
            :min="0"
            required
            mode="decimal"
            :minFractionDigits="2"
          />
        </div>

        <div class="field">
          <label for="buy_out_price">Buy Out Price:</label>
          <InputNumber
            id="buy_out_price"
            v-model="form.buy_out_price"
            :min="0"
            required
            mode="decimal"
            :minFractionDigits="2"
          />
        </div>

        <Button label="Save" type="submit" class="p-mt-2" />
      </form>
    </Card>
  </div>
</template>

<script>
import { ref } from 'vue';
import api from '@/services/api'; // Correct import
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

export default {
  name: 'BasicItems',
  components: {
    Card,
    InputText,
    InputNumber,
    Button,
  },
  setup() {
    const toast = useToast();

    const form = ref({
      name: '',
      unit_point_price: null,
      pack_size: null,
      pack_price: null,
      buy_out_price: null,
    });

    const submitForm = async () => {
      try {
        const response = await api.post('/economy/basic-items', form.value);
        if (response.status === 201) {
          toast.add({ severity: 'success', summary: 'Success', detail: 'Basic Item Created', life: 3000 });
          // Reset the form
          form.value = {
            name: '',
            unit_point_price: null,
            pack_size: null,
            pack_price: null,
            buy_out_price: null,
          };
        }
      } catch (error) {
        console.error(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create Basic Item', life: 3000 });
      }
    };

    return {
      form,
      submitForm,
    };
  },
};
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
}

.field label {
  margin-bottom: 5px;
  font-weight: bold;
}

.form-card {
  max-width: 500px;
  margin: 0 auto;
}
</style>
