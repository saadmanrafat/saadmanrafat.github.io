document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('search-input');
    const searchResultsContainer = document.getElementById('search-results');
    const searchResultsInfo = document.getElementById('search-results-info');

    let postsMetadata = [];
    let searchIndex = null;

    // Fetch the search data
    Promise.all([
        fetch('/posts-metadata.json').then(response => response.json()),
        fetch('/search-index.json').then(response => response.json())
    ]).then(([metadata, index]) => {
        postsMetadata = metadata;
        searchIndex = lunr.Index.load(index);
        handleSearch();
    }).catch(error => {
        console.error('Error loading search data:', error);
        searchResultsInfo.textContent = 'Failed to load search data.';
    });

    // Handle search on input
    searchInput.addEventListener('input', handleSearch);

    function handleSearch() {
        const query = searchInput.value.trim();

        if (query === '') {
            searchResultsInfo.textContent = 'Enter a search term to find articles.';
            searchResultsContainer.innerHTML = '';
            return;
        }

        const results = searchIndex.search(query);

        searchResultsInfo.textContent = `Found ${results.length} result${results.length === 1 ? '' : 's'} for "${query}"`;

        if (results.length > 0) {
            displayResults(results, query);
        } else {
            searchResultsContainer.innerHTML = '<p>No results found.</p>';
        }
    }

    function displayResults(results, query) {
        let resultsHtml = '';

        results.forEach(result => {
            const post = postsMetadata.find(p => p.slug === result.ref);
            if (post) {
                resultsHtml += `
                    <div class="blog-card">
                        <h2 class="blog-title">
                            <a href="/blog/${post.slug}/">${highlightText(post.title, query)}</a>
                        </h2>
                        <div class="blog-meta">
                            Published on ${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • ${post.readTime || 5} min read
                        </div>
                        <div class="blog-excerpt">
                            ${highlightText(post.description, query)}
                        </div>
                        <a href="/blog/${post.slug}/" class="read-more">Read more →</a>
                    </div>
                `;
            }
        });

        searchResultsContainer.innerHTML = resultsHtml;
    }

    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
});
