<style>
  :global(body){
    margin-bottom: 5em;
    font-family: "Source Sans Pro", Ubuntu, "Trebuchet MS", Helvetica, Arial, sans-serif;
  }

  h1{
    margin: 1em 0 0.25em 0;
  }

  p{
    margin-left: 0.75em;
  }

  main{
    display: flex;
    flex-direction: column;
    margin: auto;
    width: 500px;
    max-width: 100%;
  }

  .row{
    display: flex;
    flex-direction: row;
  }

  .row:not(:first-child){
    margin-top: 1.5em;
  }

  .wrap{
    flex: none;
    margin-right: 1.5em;
  }

  .color{
    flex: 1;
  }

</style>

<script>
import { onMount } from 'svelte';
import Picker from './Picker.svelte';

let p1, p2;
// For use from devTools
onMount(() => {
  console.log("You can use picker1 and picker2 from the console")
  console.log("Try picker1.setColor('#00ffff')");
  window.picker1 = p1
  window.picker2 = p2
})

export let color1 = "#ff0000";
export let color2 = "#00ffff";
</script>


<main>

  <h1>Svelte Picker</h1>
  <p><code>npm i svelte-picker</code></p>

  <div class="row">
    <div class="wrap">
      <Picker 
        bind:this={p1}
        on:colorChange={(e) => color1 = e.detail.hex} 
        startColor={color1}
      />
    </div>
    <div class="color" style="background-color:{color1}"/>
  </div>

  <div class="row">
    <div class="wrap">
      <Picker
        bind:this={p2}
        startColor={color2}
        on:colorChange={(e) => {
          color2 = e.detail.hex;
          p1.setColor(e.detail)
        }}
      />
    </div>
    <div class="color" style="background-color:{color2}"/>
  </div>
</main>