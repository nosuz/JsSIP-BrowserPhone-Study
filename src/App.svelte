<script>
  import { phoneAgentStore } from "./lib/PhoneAgentStore";

  import Login from "./lib/Login.svelte";
  import Phone from "./lib/Phone.svelte";

  let phoneAgent;

  phoneAgentStore.subscribe((value) => {
    phoneAgent = value;
  });
</script>

<div class="container">
  {#if phoneAgent}
    <Phone />
  {:else}
    <Login />
  {/if}
</div>

<style>
</style>
