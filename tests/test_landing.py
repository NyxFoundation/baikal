"""Static homepage contracts. Run with python3 -m unittest discover -s tests."""

from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import unquote, urlsplit


DESIGN = Path(__file__).resolve().parents[1] / "design"


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))

    def attributes(self, tag):
        return [attrs for name, attrs in self.elements if name == tag]

    @property
    def ids(self):
        return [attrs["id"] for _, attrs in self.elements if "id" in attrs]


class LandingTests(unittest.TestCase):
    def setUp(self):
        self.page = Document(DESIGN / "index.html")

    def test_should_identify_japanese_content_and_page_landmarks(self):
        self.assertEqual(self.page.attributes("html")[0]["lang"], "ja")
        for tag in ("h1", "main", "header", "footer"):
            self.assertEqual(len(self.page.attributes(tag)), 1, tag)
        self.assertTrue(self.page.attributes("nav"))
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))

    def test_should_isolate_homepage_styles_from_program_detail(self):
        styles = [a["href"] for a in self.page.attributes("link")
                  if a.get("rel") == "stylesheet"]
        self.assertIn("landing.css", styles)
        self.assertNotIn("style.css", styles)
        self.assertNotIn("tokens.css", styles)
        detail = Document(DESIGN / "program.html")
        self.assertNotIn("landing.css", [a.get("href") for a in detail.attributes("link")])

    def test_should_keep_destinations_used_by_the_program_detail(self):
        detail = Document(DESIGN / "program.html")
        for attrs in detail.attributes("a"):
            url = urlsplit(attrs.get("href", ""))
            if url.path == "index.html" and url.fragment:
                self.assertIn(unquote(url.fragment), self.page.ids)

    def test_should_resolve_every_local_link_and_asset(self):
        for tag, attrs in self.page.elements:
            url = attrs.get("href") if tag in ("a", "link") else attrs.get("src")
            if url is None:
                continue
            self.assertNotIn(url, ("", "#"))
            parsed = urlsplit(url)
            if parsed.scheme or parsed.netloc:
                self.assertEqual(parsed.scheme, "https")
                continue
            path = DESIGN / (unquote(parsed.path) or "index.html")
            self.assertTrue(path.is_file(), url)
            if parsed.fragment:
                self.assertIn(unquote(parsed.fragment), Document(path).ids, url)

    def test_should_offer_native_navigation_without_javascript(self):
        self.assertTrue(self.page.attributes("summary"))
        self.assertTrue(self.page.attributes("details"))
        self.assertIn("#main", [a.get("href") for a in self.page.attributes("a")])
        for attrs in self.page.attributes("button"):
            self.assertEqual(attrs.get("type"), "button")

    def test_should_reserve_image_dimensions_and_name_navigation(self):
        for attrs in self.page.attributes("img"):
            self.assertIn("alt", attrs)
            self.assertIn("width", attrs)
            self.assertIn("height", attrs)
        for attrs in self.page.attributes("nav"):
            self.assertIn("aria-label", attrs)

    def test_should_declare_concept_stage_without_a_fictional_cli(self):
        source = (DESIGN / "index.html").read_text()
        self.assertIn("構想段階", source)
        self.assertIn("ベータ版", source)
        self.assertIn("概念図", source)
        self.assertNotIn("get.baikal.dev", source)
        self.assertNotIn("data-copy", source)

    def test_should_not_show_access_restrictions_for_public_research(self):
        source = (DESIGN / "index.html").read_text()
        for notice in ("要アクセス権", "アクセス権が必要", "リポジトリは非公開"):
            self.assertNotIn(notice, source)

    def test_should_resolve_all_accessible_labels_and_descriptions(self):
        for _, attrs in self.page.elements:
            for attribute in ("aria-labelledby", "aria-describedby"):
                for target in attrs.get(attribute, "").split():
                    self.assertIn(target, self.page.ids, attribute)


if __name__ == "__main__":
    unittest.main()
