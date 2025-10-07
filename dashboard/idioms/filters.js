// FilterModule - D3-based filtering system for squirrel data
const FilterModule = (function() {
    
    let originalData = [];
    let activeFilters = {
        behaviors: new Set(), // For behavior checkboxes
        age: new Set(),       // For age checkboxes  
        colors: new Set(),    // For color filters
        dogs: false          // For dog toggle
    };
    let filterChangeCallback = null;

    // Initialize the filtering system
    function initializeFilters(callback) {
        console.log("Initializing filters...");
        filterChangeCallback = callback;
        
        // Setup dropdown toggle functionality
        setupDropdownToggles();
        
        // Setup checkbox event listeners
        setupCheckboxListeners();

        // Setup reset filters button
        setupResetButton();
        
        // Setup color filter listeners
        setupColorFilters();
        
        // Setup dog filter listener
        setupDogFilter();
        
        console.log("Filters initialized successfully");
    }

    // Setup dropdown toggle functionality
    function setupDropdownToggles() {
        // The event function toggles the dropdown visibility and does it automatically.
        d3.selectAll('.filter-btn').on('click', function(event) {
            event.stopPropagation();
            const button = d3.select(this);
            const dropdown = button.node().parentNode.querySelector('.dropdown-content');
            
            // Close all other dropdowns
            d3.selectAll('.dropdown-content').classed('show', false);
            d3.selectAll('.filter-btn').classed('active', false);
            
            // Toggle current dropdown
            const isCurrentlyShown = d3.select(dropdown).classed('show');
            d3.select(dropdown).classed('show', !isCurrentlyShown);
            button.classed('active', !isCurrentlyShown);
        });

        // Close dropdowns when clicking outside
        d3.select(document).on('click', function() {
            d3.selectAll('.dropdown-content').classed('show', false);
            d3.selectAll('.filter-btn').classed('active', false);
        });

        // Prevent dropdown from closing when clicking inside
        d3.selectAll('.dropdown-content').on('click', function(event) {
            event.stopPropagation();
        });
    }

    // Setup checkbox event listeners for behavior and age filters
    function setupCheckboxListeners() {
        d3.selectAll('.checkbox-item input[type="checkbox"]').on('change', function() {
            const checkbox = d3.select(this);
            const isChecked = checkbox.property('checked');
            const behavior = checkbox.attr('data-behavior');
            const column = checkbox.attr('data-column');
            const value = checkbox.attr('data-value'); // For age filter
            
            console.log(`Checkbox changed: ${behavior}, checked: ${isChecked}, column: ${column}, value: ${value}`);
            
            // Handle age filters differently
            if (column === 'Age') {
                const filterKey = `${column}:${value}`;
                if (isChecked) {
                    activeFilters.age.add(filterKey);
                } else {
                    activeFilters.age.delete(filterKey);
                }
            } else {
                // Handle behavior filters
                const filterKey = `${column}:true`; // We only filter for true values
                if (isChecked) {
                    activeFilters.behaviors.add(filterKey);
                } else {
                    activeFilters.behaviors.delete(filterKey);
                }
            }
            
            // Update button appearance
            updateButtonAppearance();
            
            // Trigger filter update
            if (filterChangeCallback) {
                filterChangeCallback();
            }
        });
    }

    function setupResetButton() {
        d3.select("#reset-filters-btn").on("click", function() {
            console.log("Reset Filters button clicked");
            clearAllFilters();
        });
    }
    
    // Setup color filter listeners
    function setupColorFilters() {
        d3.selectAll('.color-option').on('click', function() {
            const colorOption = d3.select(this);
            const color = colorOption.attr('data-color');
            const isActive = colorOption.classed('active');
            
            if (isActive) {
                // Deactivate color
                colorOption.classed('active', false);
                activeFilters.colors.delete(color);
            } else {
                // Activate color
                colorOption.classed('active', true);
                activeFilters.colors.add(color);
            }
            
            console.log(`Color filter toggled: ${color}, active: ${!isActive}`);
            console.log('Active colors:', Array.from(activeFilters.colors));
            
            // Trigger filter update
            if (filterChangeCallback) {
                filterChangeCallback();
            }
        });
    }

    // Setup dog filter listener
    function setupDogFilter() {
        d3.select('.dog-toggle').on('click', function() {
            const dogToggle = d3.select(this);
            const isActive = dogToggle.classed('active');
            
            dogToggle.classed('active', !isActive);
            activeFilters.dogs = !isActive;
            
            console.log(`Dog filter toggled: ${!isActive}`);
            
            // Trigger filter update
            if (filterChangeCallback) {
                filterChangeCallback();
            }
        });
    }

    // Update button appearance based on active filters
    function updateButtonAppearance() {
        // Update behavior filter buttons
        d3.selectAll('.filter-dropdown').each(function() {
            const dropdown = d3.select(this);
            const category = dropdown.select('.dropdown-content').attr('data-category');
            const button = dropdown.select('.filter-btn');
            
            // Check if any checkboxes in this category are checked
            const hasActiveFilters = dropdown.selectAll('input[type="checkbox"]:checked').size() > 0;
            button.classed('active', hasActiveFilters);
        });
    }

    // Apply all active filters to the data
    function applyFilters(data) {
        console.log('Applying filters to', data.length, 'records');
        console.log('Active filters:', {
            behaviors: Array.from(activeFilters.behaviors),
            age: Array.from(activeFilters.age),
            colors: Array.from(activeFilters.colors),
            dogs: activeFilters.dogs
        });
        
        let filtered = data.slice(); // Create a copy
        
        // Apply behavior filters (AND logic within behaviors)
        if (activeFilters.behaviors.size > 0) {
            filtered = filtered.filter(record => {
                return Array.from(activeFilters.behaviors).every(filterKey => {
                    const [column, value] = filterKey.split(':');
                    return record[column] === (value === 'true');
                });
            });
        }
        
        // Apply age filters (OR logic for age values)
        if (activeFilters.age.size > 0) {
            filtered = filtered.filter(record => {
                return Array.from(activeFilters.age).some(filterKey => {
                    const [column, value] = filterKey.split(':');
                    return record[column] === value;
                });
            });
        }
        
        // Apply color filters (OR logic for colors)
        if (activeFilters.colors.size > 0) {
            filtered = filtered.filter(record => {
                const furColor = record['Primary Fur Color'];
                if (!furColor) return false;
                
                return Array.from(activeFilters.colors).some(color => {
                    switch(color) {
                        case 'gray': return furColor.toLowerCase() === 'gray';
                        case 'cinnamon': return furColor.toLowerCase() === 'cinnamon';
                        case 'black': return furColor.toLowerCase() === 'black';
                        default: return false;
                    }
                });
            });
        }
        
        // Apply dog filter
        if (activeFilters.dogs) {
            filtered = filtered.filter(record => {
                return record['Dogs'] && record['Dogs'] > 0;
            });
        }
        
        console.log('Filtered data:', filtered.length, 'records');
        return filtered;
    }

    // Clear all filters
    function clearAllFilters() {
        // Clear active filters
        activeFilters.behaviors.clear();
        activeFilters.age.clear();
        activeFilters.colors.clear();
        activeFilters.dogs = false;
        
        // Uncheck all checkboxes
        d3.selectAll('input[type="checkbox"]').property('checked', false);
        
        // Remove active classes
        d3.selectAll('.filter-btn, .color-option, .dog-toggle').classed('active', false);
        
        // Close all dropdowns
        d3.selectAll('.dropdown-content').classed('show', false);
        
        // Trigger filter update
        if (filterChangeCallback) {
            filterChangeCallback();
        }
    }

    // Get current filter state for debugging
    function getCurrentFilters() {
        return {
            behaviors: Array.from(activeFilters.behaviors),
            age: Array.from(activeFilters.age),
            colors: Array.from(activeFilters.colors),
            dogs: activeFilters.dogs
        };
    }

    function toggleBehavior(activity) {
        const filterKey = `${activity}:true`; // same format you used for behaviors
        if (activeFilters.behaviors.has(filterKey)) {
            activeFilters.behaviors.delete(filterKey);
            // Uncheck the corresponding checkbox
            d3.select(`.checkbox-item input[data-column="${activity}"]`)
            .property("checked", false);
        } else {
            activeFilters.behaviors.add(filterKey);
            // Check the corresponding checkbox
            d3.select(`.checkbox-item input[data-column="${activity}"]`)
            .property("checked", true);
        }

        updateButtonAppearance();

        if (filterChangeCallback) {
            filterChangeCallback();
        }
    }

    // Public API
    return {
        initializeFilters: initializeFilters,
        applyFilters: applyFilters,
        clearAllFilters: clearAllFilters,
        getCurrentFilters: getCurrentFilters,
        toggleBehavior: toggleBehavior
    };
})();

// Make FilterModule available globally
window.FilterModule = FilterModule;
