<script>
  import { phoneAgent } from "./lib/PhoneAgentStore";

  import Login from "./lib/Login.svelte";
  import Phone from "./lib/Phone.svelte";
</script>

<div class="container">
  {#if $phoneAgent}
    <Phone />
  {:else}
    <Login />
  {/if}
</div>

<style>
</style>
