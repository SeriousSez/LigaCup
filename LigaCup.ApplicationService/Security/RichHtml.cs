using Ganss.Xss;

namespace LigaCup.ApplicationService.Security;

/// <summary>One allowlist for persisted and legacy rules/parking. Reading never rewrites stored data.</summary>
public static class RichHtml
{
    public static string? Sanitize(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return html;

        // Create a parser per call: sanitizer instances are not shared between requests.
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedTags.UnionWith(new[]
        {
            "p", "div", "br", "hr", "span", "b", "strong", "i", "em", "u", "s", "strike",
            "sub", "sup", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
            "blockquote", "pre", "code", "a", "img", "font", "table", "thead", "tbody",
            "tfoot", "tr", "th", "td", "caption"
        });
        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedAttributes.UnionWith(new[]
        {
            "href", "src", "alt", "title", "style", "class", "width", "height", "loading",
            "color", "size", "face", "align", "colspan", "rowspan", "start", "type"
        });
        sanitizer.AllowedClasses.Clear();
        sanitizer.AllowedClasses.UnionWith(new[]
        {
            "rte-image-small", "rte-image-medium", "rte-image-large", "rte-image-full"
        });
        sanitizer.AllowedCssProperties.Clear();
        sanitizer.AllowedCssProperties.UnionWith(new[]
        {
            "color", "background-color", "font-size", "font-family", "font-weight", "font-style",
            "text-align", "text-decoration", "width", "max-width", "height", "vertical-align"
        });
        sanitizer.AllowedAtRules.Clear();
        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.UnionWith(new[] { "https", "http", "mailto", "tel" });
        sanitizer.UriAttributes.UnionWith(new[] { "href", "src" });
        sanitizer.AllowDataAttributes = false;
        return sanitizer.Sanitize(html);
    }
}
