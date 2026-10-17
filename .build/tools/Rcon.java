import java.io.*;
import java.net.*;
import java.nio.*;
import java.nio.charset.StandardCharsets;

/** Cliente RCON minimo para testes: java Rcon.java host porta senha "cmd1" "@sleep 500" "cmd2" ... */
public class Rcon {
    static void send(OutputStream out, int reqId, int type, String payload) throws IOException {
        byte[] p = payload.getBytes(StandardCharsets.UTF_8);
        ByteBuffer b = ByteBuffer.allocate(14 + p.length).order(ByteOrder.LITTLE_ENDIAN);
        b.putInt(10 + p.length).putInt(reqId).putInt(type).put(p).put((byte) 0).put((byte) 0);
        out.write(b.array());
        out.flush();
    }

    static String[] read(DataInputStream in) throws IOException {
        byte[] lenB = new byte[4];
        in.readFully(lenB);
        int len = ByteBuffer.wrap(lenB).order(ByteOrder.LITTLE_ENDIAN).getInt();
        byte[] body = new byte[len];
        in.readFully(body);
        int reqId = ByteBuffer.wrap(body).order(ByteOrder.LITTLE_ENDIAN).getInt();
        return new String[]{String.valueOf(reqId), new String(body, 8, Math.max(0, len - 10), StandardCharsets.UTF_8)};
    }

    public static void main(String[] a) throws Exception {
        try (Socket s = new Socket(a[0], Integer.parseInt(a[1]))) {
            s.setSoTimeout(60000);
            OutputStream out = s.getOutputStream();
            DataInputStream in = new DataInputStream(s.getInputStream());
            send(out, 99, 3, a[2]);
            if (read(in)[0].equals("-1")) {
                System.out.println("AUTH FALHOU");
                return;
            }
            int id = 1;
            for (int i = 3; i < a.length; i++) {
                if (a[i].startsWith("@sleep ")) {
                    Thread.sleep(Long.parseLong(a[i].substring(7)));
                    continue;
                }
                send(out, ++id, 2, a[i]);
                System.out.println("> " + a[i]);
                System.out.println(read(in)[1].replaceAll("§.", ""));
            }
        }
    }
}
