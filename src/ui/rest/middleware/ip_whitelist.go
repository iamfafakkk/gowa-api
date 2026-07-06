package middleware

import (
	"fmt"
	"net/netip"
	"strings"

	"github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/utils"
	"github.com/gofiber/fiber/v2"
)

type ipWhitelist struct {
	ips      map[netip.Addr]struct{}
	prefixes []netip.Prefix
}

func IPWhitelist(allowed []string) (fiber.Handler, error) {
	list, err := parseIPWhitelist(allowed)
	if err != nil {
		return nil, err
	}

	return func(c *fiber.Ctx) error {
		if len(list.ips) == 0 && len(list.prefixes) == 0 {
			return c.Next()
		}

		addr, err := netip.ParseAddr(strings.TrimSpace(c.IP()))
		if err != nil || !list.allowed(addr) {
			return c.Status(fiber.StatusForbidden).JSON(utils.ResponseData{
				Status:  fiber.StatusForbidden,
				Code:    "IP_NOT_ALLOWED",
				Message: "IP is not allowed",
				Results: nil,
			})
		}

		return c.Next()
	}, nil
}

func parseIPWhitelist(entries []string) (ipWhitelist, error) {
	list := ipWhitelist{ips: make(map[netip.Addr]struct{})}
	for _, entry := range entries {
		entry = strings.TrimSpace(entry)
		if entry == "" {
			continue
		}

		if strings.Contains(entry, "/") {
			prefix, err := netip.ParsePrefix(entry)
			if err != nil {
				return ipWhitelist{}, fmt.Errorf("invalid IP whitelist entry %q: %w", entry, err)
			}
			list.prefixes = append(list.prefixes, prefix)
			continue
		}

		addr, err := netip.ParseAddr(entry)
		if err != nil {
			return ipWhitelist{}, fmt.Errorf("invalid IP whitelist entry %q: %w", entry, err)
		}
		list.ips[addr] = struct{}{}
	}
	return list, nil
}

func (w ipWhitelist) allowed(addr netip.Addr) bool {
	if _, ok := w.ips[addr]; ok {
		return true
	}
	for _, prefix := range w.prefixes {
		if prefix.Contains(addr) {
			return true
		}
	}
	return false
}
