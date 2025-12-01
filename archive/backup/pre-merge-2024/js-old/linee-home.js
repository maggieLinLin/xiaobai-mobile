document.addEventListener('DOMContentLoaded', () => {
    // Initial Data
    const friends = [
        { name: "Alice", status: "Work hard, play hard", avatar: "A" },
        { name: "Bob", status: "Available", avatar: "B" },
        { name: "Charlie", status: "At the gym", avatar: "C" },
        { name: "David", status: "Sleeping...", avatar: "D" },
        { name: "Eve", status: "Coding LINEE", avatar: "E" }
    ];

    const groups = [
        { name: "Family", count: 4, avatar: "F" },
        { name: "Work Team", count: 12, avatar: "W" }
    ];

    // --- Render Functions ---
    function renderFriends() {
        const list = document.getElementById('friends-list');
        const count = document.getElementById('friend-count');
        list.innerHTML = '';
        friends.forEach(f => {
            const item = document.createElement('div');
            item.className = 'friend-item';
            item.innerHTML = `
                <div class="friend-avatar" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:18px;">${f.avatar}</div>
                <div class="friend-info">
                    <div class="friend-name">${f.name}</div>
                    <div class="friend-status">${f.status}</div>
                </div>
            `;
            list.appendChild(item);
        });
        count.innerText = `(${friends.length})`;
    }

    function renderGroups() {
        const list = document.getElementById('groups-list');
        const count = document.getElementById('group-count');
        list.innerHTML = '';
        groups.forEach(g => {
            const item = document.createElement('div');
            item.className = 'friend-item'; // Reuse styles
            item.innerHTML = `
                <div class="friend-avatar" style="background:#E8F6FA;color:#A0D8EF;display:flex;align-items:center;justify-content:center;font-weight:bold;">${g.avatar}</div>
                <div class="friend-info">
                    <div class="friend-name">${g.name}</div>
                    <div class="friend-status">${g.count} users</div>
                </div>
            `;
            list.appendChild(item);
        });
        count.innerText = `(${groups.length})`;
    }

    // --- Event Listeners ---
    
    // Add Friend Popover
    const btnAdd = document.getElementById('btn-add');
    const popover = document.getElementById('add-popover');
    
    if (btnAdd) {
        btnAdd.addEventListener('click', (e) => {
            e.stopPropagation();
            popover.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (e) => {
        if (btnAdd && !btnAdd.contains(e.target) && !popover.contains(e.target)) {
            popover.classList.add('hidden');
        }
    });

    // Modals
    const modalAddFriend = document.getElementById('modal-add-friend');
    const modalAddGroup = document.getElementById('modal-add-group');

    const optAddFriend = document.getElementById('opt-add-friend');
    if (optAddFriend) {
        optAddFriend.addEventListener('click', () => {
            popover.classList.add('hidden');
            modalAddFriend.classList.remove('hidden');
        });
    }

    const optAddGroup = document.getElementById('opt-add-group');
    if (optAddGroup) {
        optAddGroup.addEventListener('click', () => {
            popover.classList.add('hidden');
            modalAddGroup.classList.remove('hidden');
        });
    }

    window.closeModal = (id) => {
        document.getElementById(id).classList.add('hidden');
    };

    window.confirmAddFriend = () => {
        const input = document.getElementById('new-friend-name');
        const name = input.value.trim();
        if (name) {
            friends.push({ name, status: "New Friend", avatar: name[0].toUpperCase() });
            renderFriends();
            input.value = '';
            closeModal('modal-add-friend');
        }
    };

    window.confirmAddGroup = () => {
        const input = document.getElementById('new-group-name');
        const name = input.value.trim();
        if (name) {
            groups.push({ name, count: 1, avatar: name[0].toUpperCase() });
            renderGroups();
            input.value = '';
            closeModal('modal-add-group');
        }
    };

    // Accordion Toggle
    window.toggleList = (listId, header) => {
        const list = document.getElementById(listId);
        const group = header.parentElement;
        
        // Toggle hidden class on list
        list.classList.toggle('hidden');
        
        // Toggle expanded class on group wrapper (for arrow rotation)
        group.classList.toggle('expanded');

        // Optional: If closing, remove expanded class
        if (list.classList.contains('hidden')) {
            group.classList.remove('expanded');
        } else {
            group.classList.add('expanded');
        }
    };

    // Personal Cards Selection
    const cards = document.querySelectorAll('.p-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });

    // Navigation Tabs
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            // Logic to switch view would go here
        });
    });

    // Initial Render
    renderFriends();
    renderGroups();
});

