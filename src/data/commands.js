export const commands = [
    {
        description: 'Show connected client details',
        cisco: 'show client detail <mac>',
        aruba: 'show stm client-info <mac>',
        ruckus: 'get client-info <mac>'
    },
    {
        description: 'Show AP summary and status',
        cisco: 'show ap summary',
        aruba: 'show ap database',
        ruckus: 'get all-ap-info'
    },
    {
        description: 'Show radio configurations',
        cisco: 'show ap dot11 5ghz summary',
        aruba: 'show ap active',
        ruckus: 'get radio-info <ap-name>'
    },
    {
        description: 'Check interface errors',
        cisco: 'show interface <id>',
        aruba: 'show interface <id> counters',
        ruckus: 'get port-stats <id>'
    },
    {
        description: 'Verify VLAN assignments',
        cisco: 'show bridge-group',
        aruba: 'show vlan',
        ruckus: 'get vlan-info'
    }
];
