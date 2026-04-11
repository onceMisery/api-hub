package com.apihub.debug.service;

import java.net.InetAddress;
import java.util.List;

@FunctionalInterface
public interface DebugHostResolver {

    List<InetAddress> resolve(String host) throws Exception;
}
