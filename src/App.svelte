<script>
	import Static from './Static.svelte';
	import Dynamic from './Dynamic.svelte';
	import Task from './Task.svelte';
	
	let items = [
		{ icon: 'book', title: 'bulma', tags: ['public', 'sources'] },
		{ icon: 'book', title: 'marksheet', tags: ['private'] },
		{ icon: 'book', title: 'minireset.css', tags: ['public', 'sources'] },
		{ icon: 'code-branch', title: 'daniellowtw/infboard', tags: ['public', 'forks'] },
		{ icon: 'code-branch', title: 'mojs', tags: ['private'] }
	]
</script>

<style>
	@import "https://cdn.jsdelivr.net/npm/bulma@0.9.2/css/bulma.min.css";
	@import "https://pro.fontawesome.com/releases/v5.10.0/css/all.css";
</style>

<!-- <section class="section">
	<div class="container">
		<Task />
	</div>
</section> -->

<section class="section">
	<div class="container">
		<!-- This: -->
		<Dynamic {items} />
		
		<hr />
	
		<!-- should look like this: -->
		<!-- <Static />		 -->
	</div>
</section>
