"""Static homepage contracts. Run with python3 -m unittest discover -s tests."""

from html.parser import HTMLParser
from pathlib import Path
import json
import unittest
from urllib.parse import unquote, urlsplit


DESIGN = Path(__file__).resolve().parents[1] / "design"


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.elements = []
        self.programs = []
        self.current_program = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        element = (tag, dict(attrs))
        self.elements.append(element)
        if tag == "article":
            self.current_program = {"elements": [], "text": []}
        if self.current_program is not None:
            self.current_program["elements"].append(element)

    def handle_data(self, data):
        if self.current_program is not None:
            self.current_program["text"].append(data)

    def handle_endtag(self, tag):
        if tag == "article" and self.current_program is not None:
            self.programs.append(self.current_program)
            self.current_program = None

    def attributes(self, tag):
        return [attrs for name, attrs in self.elements if name == tag]

    @property
    def ids(self):
        return [attrs["id"] for _, attrs in self.elements if "id" in attrs]


class LandingTests(unittest.TestCase):
    def setUp(self):
        self.page = Document(DESIGN / "index.html")

    def test_should_preserve_english_ui_and_page_landmarks(self):
        self.assertEqual(self.page.attributes("html")[0]["lang"], "en")
        for filename in ("index.html", "landing.css", "landing.js"):
            self.assertNotRegex((DESIGN / filename).read_text(),
                                r"[\u3040-\u30ff\u3400-\u9fff]", filename)
        for tag in ("h1", "main", "header", "footer"):
            self.assertEqual(len(self.page.attributes(tag)), 1, tag)
        self.assertTrue(self.page.attributes("nav"))
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))

    def test_should_preserve_all_eight_original_programs_and_their_details(self):
        fixture = Path(__file__).parent / "fixtures" / "original_programs.json"
        expected = json.loads(fixture.read_text())["programs"]
        self.assertEqual(len(expected), 8)
        self.assertEqual(len(self.page.programs), len(expected))
        for actual, original in zip(self.page.programs, expected):
            with self.subTest(program=original["title"]):
                text = " ".join(" ".join(actual["text"]).split())
                for field in original.values():
                    self.assertIn(field, text)
                figures = [a for tag, a in actual["elements"] if tag == "svg"]
                self.assertEqual(len(figures), 1)
                self.assertEqual(figures[0].get("role"), "img")
                self.assertTrue(figures[0].get("aria-label"))
                links = [a for tag, a in actual["elements"] if tag == "a"]
                self.assertEqual([a.get("href") for a in links], ["program.html"])
                self.assertIn("Illustrative", text)

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
        self.assertIn("concept stage", source)
        self.assertIn("Beta", source)
        self.assertIn("shared program template", source)
        self.assertNotIn("get.baikal.dev", source)
        self.assertNotIn("data-copy", source)

    def test_should_omit_unrequested_disclaimer_for_decorative_art(self):
        source = (DESIGN / "index.html").read_text()
        self.assertNotIn("Conceptual illustration of exploration and verification.", source)
        self.assertNotIn("Not research data.", source)

    def test_should_not_show_access_restrictions_for_public_research(self):
        source = (DESIGN / "index.html").read_text()
        for notice in ("Access required", "Private repository", "Request access"):
            self.assertNotIn(notice, source)

    def test_should_resolve_all_accessible_labels_and_descriptions(self):
        for _, attrs in self.page.elements:
            for attribute in ("aria-labelledby", "aria-describedby"):
                for target in attrs.get(attribute, "").split():
                    self.assertIn(target, self.page.ids, attribute)


if __name__ == "__main__":
    unittest.main()
