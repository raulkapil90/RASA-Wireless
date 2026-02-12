export const activeIssues = [
    {
        id: 'dfs-001',
        title: 'DFS Radar Event Detected',
        severity: 'critical',
        location: 'Building A - Floor 4',
        timestamp: '2 mins ago',
        device: 'Cisco 9800-CL',
        evidence: 'RADAR detected on channel 52. AP-04 shifted to channel 36 immediately. Client connectivity dropped for 15 users.',
        remediation: [
            'Identify if the radar event is persistent or a one-time occurrence.',
            'Check local spectrum analysis to see if military or weather radar is active nearby.',
            'Consider excluding DFS channels from the RRM/DCA assignment if this occurs frequently.'
        ]
    },
    {
        id: 'dhcp-002',
        title: 'DHCP Timeout Failure',
        severity: 'warning',
        location: 'Singapore Branch - Ground Floor',
        timestamp: '15 mins ago',
        device: 'Aruba 7210',
        evidence: 'Multiple clients stuck in "Obtaining IP Address" state. DHCP Discover packets sent, no Offer received from server 10.1.20.5.',
        remediation: [
            'Verify DHCP Relay (IP Helper) configuration on the core switch.',
            'Check if the DHCP scope for VLAN 20 is exhausted.',
            'Test connectivity between the Wireless Controller and the DHCP server.'
        ]
    },
    {
        id: 'cci-003',
        title: 'High Co-Channel Interference',
        severity: 'warning',
        location: 'Bangladesh Office - Main Hall',
        timestamp: '1 hour ago',
        device: 'Ruckus ZoneDirector',
        evidence: 'CCI over 40% on 2.4GHz band. 5 APs visible on channel 6 with signal > -65dBm.',
        remediation: [
            'Reduce transmit power on 2.4GHz radios to minimize cell overlap.',
            'Disable 2.4GHz on every other AP to reduce noise floor.',
            'Encourage users to migrate to 5GHz/6GHz by enabling Band Steering.'
        ]
    }
];
