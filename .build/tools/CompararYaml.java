import org.yaml.snakeyaml.Yaml;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Compara dois YAML pelo conteúdo (ignora formatação). Uso: CompararYaml a.yml b.yml */
public class CompararYaml {
    public static void main(String[] a) throws Exception {
        Map<String, Object> x = achatar(ler(a[0]));
        Map<String, Object> y = achatar(ler(a[1]));
        Set<String> chaves = new TreeSet<>(x.keySet());
        chaves.addAll(y.keySet());
        int dif = 0;
        for (String k : chaves) {
            Object va = x.get(k), vb = y.get(k);
            if (!Objects.equals(norm(va), norm(vb))) {
                dif++;
                System.out.println("  " + k + "\n    padrao: " + va + "\n    atual:  " + vb);
            }
        }
        System.out.println(dif == 0 ? "IGUAL" : dif + " diferenca(s)");
    }
    static Object norm(Object o) { return o instanceof Number n ? (Object) n.doubleValue() : o; }
    @SuppressWarnings("unchecked")
    static Map<String, Object> ler(String f) throws Exception {
        try (var r = new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8)) {
            Object o = new Yaml().load(r);
            return o == null ? Map.of() : (Map<String, Object>) o;
        }
    }
    @SuppressWarnings("unchecked")
    static Map<String, Object> achatar(Map<String, Object> m) {
        Map<String, Object> r = new TreeMap<>();
        for (var e : m.entrySet()) {
            if (e.getValue() instanceof Map<?, ?> sub) {
                achatar((Map<String, Object>) sub).forEach((k, v) -> r.put(e.getKey() + "." + k, v));
            } else {
                r.put(String.valueOf(e.getKey()), e.getValue());
            }
        }
        return r;
    }
}
