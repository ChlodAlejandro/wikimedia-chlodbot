/**
 * nd trims out leading tabs or spaces that may be present whenever
 * creating multiline strings with backtick marks. This shouldn't
 * matter when dealing with SQL, but will matter with almost
 * everything else.
 *
 * @param string The string to remove indents from.
 */
export default function(string : string) : string {
    return string.trim().split("\n").map(v => v.trimStart()).join("\n");
}
