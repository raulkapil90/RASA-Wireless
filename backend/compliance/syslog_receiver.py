"""Async UDP Syslog receiver on port 5140 (dev). Triggers config audits on config-change events."""
import asyncio
import logging

logger = logging.getLogger("syslog_receiver")

# Known config-change event signatures per vendor
CONFIG_CHANGE_SIGNATURES = [
    "%SYS-5-CONFIG_I",          # Cisco IOS-XE / IOS
    "%MGMT-6-CONFIG_CHANGE",    # Cisco NXOS
    "CONFIG_CHANGE",            # Arista EOS
    "config-change",            # Generic
]

SYSLOG_PORT = 5140  # Unprivileged port for dev; forward from 514 in production


class SyslogProtocol(asyncio.DatagramProtocol):
    def datagram_received(self, data: bytes, addr):
        try:
            message = data.decode("utf-8", errors="ignore")
        except Exception:
            return

        logger.info(f"[Syslog] {addr[0]}: {message[:120]}")

        if any(sig in message for sig in CONFIG_CHANGE_SIGNATURES):
            src_ip = addr[0]
            logger.warning(
                f"[Syslog] CONFIG CHANGE detected from {src_ip}. "
                "Enqueue on-demand audit (stub – wire to audit_engine in production)."
            )
            # In production: look up device by src_ip, SSH-pull config, call audit_config()

    def error_received(self, exc):
        logger.error(f"[Syslog] Transport error: {exc}")

    def connection_lost(self, exc):
        logger.info("[Syslog] Connection closed.")


async def start_syslog_server() -> asyncio.BaseTransport:
    """Start the UDP syslog listener. Returns the transport for lifecycle management."""
    loop = asyncio.get_event_loop()
    try:
        transport, _ = await loop.create_datagram_endpoint(
            SyslogProtocol,
            local_addr=("0.0.0.0", SYSLOG_PORT),
        )
        logger.info(f"[Syslog] Listening on UDP port {SYSLOG_PORT}")
        return transport
    except OSError as e:
        logger.warning(f"[Syslog] Could not bind port {SYSLOG_PORT}: {e}. Running without syslog receiver.")
        return None
