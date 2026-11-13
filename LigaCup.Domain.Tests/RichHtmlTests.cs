using AngleSharp.Html.Parser;
using LigaCup.ApplicationService.Security;

namespace LigaCup.Domain.Tests;

public class RichHtmlTests
{
    [Theory]
    [InlineData("<script>alert(1)</script><p onclick='alert(1)'>Rule</p>")]
    [InlineData("<a href='jav&#x61;script:alert(1)'>Link</a><img src='data:image/svg+xml,evil' onerror='alert(1)'>")]
    [InlineData("<svg onload='alert(1)'><a href='javascript:alert(1)'>X</a></svg><math><mtext>X</mtext></math>")]
    [InlineData("<iframe srcdoc='<script>alert(1)</script>'></iframe><form id='attributes'><input name='innerHTML'></form>")]
    [InlineData("<p style='position:fixed;background-image:url(javascript:alert(1));color:red'>Text</p>")]
    [InlineData("<math><mtext><table><mglyph><style><!--</style><img title='--><img src=x onerror=alert(1)>'>")]
    public void RemovesActiveMarkupAndUnsafeStyles(string input)
    {
        var clean = RichHtml.Sanitize(input)!;
        var document = new HtmlParser().ParseDocument(clean);
        Assert.Empty(document.QuerySelectorAll("script,iframe,svg,math,form,input"));
        foreach (var element in document.QuerySelectorAll("*"))
        foreach (var attribute in element.Attributes)
        {
            Assert.False(attribute.Name.StartsWith("on", StringComparison.OrdinalIgnoreCase));
            Assert.DoesNotContain("javascript:", attribute.Value, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("data:", attribute.Value, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("position", attribute.Value, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("expression", attribute.Value, StringComparison.OrdinalIgnoreCase);
        }
        Assert.Equal(clean, RichHtml.Sanitize(clean));
    }

    [Fact]
    public void PreservesLegitimateFormattingLinksAndImageSizing()
    {
        const string input = "<h2>Custom ÆØÅ</h2><p style='text-align:center;color:#123456'><strong>Bold</strong><em>Italic</em><u>Underline</u></p>"
            + "<ol><li>Rule</li></ol><a href='https://example.test'>Link</a><a href='mailto:test@example.test'>Email</a>"
            + "<table><tbody><tr><td colspan='2'>Parking</td></tr></tbody></table>"
            + "<img class='rte-image-medium is-selected unwanted' src='/uploads/rules/map.png' alt='Map' style='width:50%'>";
        var clean = RichHtml.Sanitize(input)!;
        var document = new HtmlParser().ParseDocument(clean);
        Assert.Equal("Custom ÆØÅ", document.QuerySelector("h2")!.TextContent);
        Assert.NotNull(document.QuerySelector("strong"));
        Assert.NotNull(document.QuerySelector("em"));
        Assert.NotNull(document.QuerySelector("u"));
        Assert.Contains("text-align", document.QuerySelector("p")!.GetAttribute("style"));
        Assert.Equal("rte-image-medium", document.QuerySelector("img")!.ClassName);
        Assert.Contains("50%", document.QuerySelector("img")!.GetAttribute("style"));
        Assert.Equal("/uploads/rules/map.png", document.QuerySelector("img")!.GetAttribute("src"));
        Assert.Equal("2", document.QuerySelector("td")!.GetAttribute("colspan"));
        Assert.Equal(2, document.QuerySelectorAll("a[href]").Length);
    }
}
