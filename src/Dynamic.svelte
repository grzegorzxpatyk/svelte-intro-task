<script>
    export let items;

    // need to push into items.tags[] array an 'all' tag for each item
    items.forEach((item) => item.tags.push("all"));

    let searchBarInnerText = "";
    let currentTag = "";

    const tags = ["all", "public", "private", "sources", "forks"];

    function resetAllFilters() {
        // reset the search bar
        searchBarInnerText = "";
        // reset tag bar
        currentTag = "";
    }

    $: if (!currentTag) {
        currentTag = "all";
    }
</script>

<nav class="panel">
    <p class="panel-heading">Repositories</p>
    <div class="panel-block">
        <p class="control has-icons-left">
            <input
                class="input search-bar"
                type="text"
                placeholder="Search"
                bind:value={searchBarInnerText}
            />
            <span class="icon is-left">
                <i class="fas fa-search" aria-hidden="true" />
            </span>
        </p>
    </div>
    <p class="panel-tabs">
        {#each tags as tag}
            {#if tag === currentTag}
                <!-- svelte-ignore a11y-missing-attribute -->
                <a
                    class="is-active"
                    on:click|preventDefault={() => {
                        currentTag = tag;
                    }}>{tag.charAt(0).toUpperCase() + tag.slice(1)}</a
                >
            {:else}
                <!-- svelte-ignore a11y-missing-attribute -->
                <a
                    on:click|preventDefault={() => {
                        currentTag = tag;
                    }}
                >
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </a>
            {/if}
        {/each}
    </p>
    {#each items as item}
        {#if currentTag === "" && !searchBarInnerText}
            <!-- svelte-ignore a11y-missing-attribute -->
            <a class="panel-block is-active">
                <span class="panel-icon">
                    <i class="fas fa-{item.icon}" aria-hidden="true" />
                </span>
                {item.title}
            </a>
        {:else if (item.tags.some(tag => tag === currentTag)) && item.title.includes(searchBarInnerText.toLowerCase())}
            <!-- svelte-ignore a11y-missing-attribute -->
            <a class="panel-block is-active">
                <span class="panel-icon">
                    <i class="fas fa-{item.icon}" aria-hidden="true" />
                </span>
                {item.title}
            </a>
        {/if}
    {/each}
    <div class="panel-block">
        <button
            class="button is-link is-outlined is-fullwidth"
            on:click={resetAllFilters}
        >
            Reset all filters
        </button>
    </div>
</nav>
