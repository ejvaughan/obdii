import socket,sys,struct

sock = socket.socket(socket.PF_CAN, socket.SOCK_RAW, socket.CAN_RAW);
interface = "can0"
try:
	sock.bind((interface,))
except OSError:
	sys.stderr.write("Could not bind to interface '%s'\n" % interface);

fmt = "<iB3x8B"

# OBD-II request for engine RPMs

can_id = 0x18DB33F1 | socket.CAN_EFF_FLAG
can_pkt = struct.pack(fmt, can_id, 8, 0x02, 0x01, 0x0C, 0x00, 0x00, 0x00, 0x00, 0x00)

sock.send(can_pkt)
